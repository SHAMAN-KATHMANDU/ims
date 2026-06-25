import crypto from "crypto";
import { createError } from "@/middlewares/errorHandler";
import { env } from "@/config/env";
import { basePrisma } from "@/config/prisma";
import { logger } from "@/config/logger";
import { encrypt, decrypt } from "@/utils/encryption";
import { MetaCredentialKind } from "@prisma/client";
import metaIntegrationRepository from "./meta-integration.repository";
import messagingChannelRepository from "@/modules/messaging-channels/messaging-channel.repository";
import {
  DEFAULT_GRAPH_API_VERSION,
  metaGraphRequest,
} from "@/modules/meta-graph/meta-graph.client";
import type {
  AddCredentialDto,
  TestCredentialDto,
  UpsertAppCredentialsDto,
} from "./meta-integration.schema";

/** Page webhook fields we subscribe to so inbound Messenger events reach the inbox. */
const WEBHOOK_SUBSCRIBED_FIELDS =
  "messages,messaging_postbacks,message_deliveries,message_reads";

/** Ad-account ids are stored without the "act_" prefix; the Graph layer re-adds it. */
function normalizeAdAccountId(value: string): string {
  return value.replace(/^act_/i, "").trim();
}

/** Absolute webhook callback URL the tenant pastes into their Meta app dashboard. */
export function metaWebhookUrl(): string {
  return `${env.publicApiUrl.replace(/\/+$/, "")}/webhooks/messenger`;
}

/**
 * Resolve a tenant's own Facebook App Secret from a page id, WITHOUT a tenant
 * context (used by the unauthenticated webhook signature check). Returns
 * undefined when the page isn't a BYO page (caller falls back to the platform
 * secret). Uses the unscoped client deliberately — webhooks carry no tenant.
 */
export async function resolveAppSecretForPage(
  pageId: string,
): Promise<string | undefined> {
  const channel = await basePrisma.messagingChannel.findUnique({
    where: {
      provider_externalId: {
        provider: "FACEBOOK_MESSENGER",
        externalId: pageId,
      },
    },
    select: { tenantId: true },
  });
  if (!channel) return undefined;
  const integration = await basePrisma.metaIntegration.findUnique({
    where: { tenantId: channel.tenantId },
    select: { appSecretEnc: true },
  });
  if (!integration?.appSecretEnc) return undefined;
  return decrypt(integration.appSecretEnc);
}

interface TokenValidationResult {
  kind: MetaCredentialKind;
  page?: { id: string; name?: string; category?: string };
  adAccounts?: Array<{ id: string; account_id?: string; name?: string }>;
}

export class MetaIntegrationService {
  /** Decrypted App Secret for the tenant, or undefined if none stored. */
  async getAppSecret(tenantId: string): Promise<string | undefined> {
    const integration =
      await metaIntegrationRepository.getIntegration(tenantId);
    if (!integration?.appSecretEnc) return undefined;
    return decrypt(integration.appSecretEnc);
  }

  /**
   * Ensure the tenant has an integration row with an app-level webhook verify
   * token. The token must exist BEFORE a page is connected so the tenant can set
   * up their Meta app's webhook first; it's generated lazily on first view.
   */
  private async ensureWebhookVerifyToken(tenantId: string) {
    let integration = await metaIntegrationRepository.getIntegration(tenantId);
    if (!integration) {
      await metaIntegrationRepository.ensureIntegration(tenantId);
      integration = await metaIntegrationRepository.getIntegration(tenantId);
    }
    if (integration && !integration.webhookVerifyToken) {
      await metaIntegrationRepository.upsertIntegration(tenantId, {
        webhookVerifyToken: crypto.randomBytes(24).toString("hex"),
      });
      integration = await metaIntegrationRepository.getIntegration(tenantId);
    }
    return integration!;
  }

  /** Issue a fresh app-level webhook verify token (invalidates the old one). */
  async regenerateWebhookToken(tenantId: string) {
    await metaIntegrationRepository.ensureIntegration(tenantId);
    await metaIntegrationRepository.upsertIntegration(tenantId, {
      webhookVerifyToken: crypto.randomBytes(24).toString("hex"),
    });
    return this.getSummary(tenantId);
  }

  /** Masked, secret-free view for the Settings UI (incl. webhook onboarding info). */
  async getSummary(tenantId: string) {
    const integration = await this.ensureWebhookVerifyToken(tenantId);

    // For PAGE credentials, attach the linked inbox channel's status.
    const channels = await messagingChannelRepository.findAll(tenantId);
    const channelByPage = new Map(
      channels
        .filter((c) => c.provider === "FACEBOOK_MESSENGER" && c.externalId)
        .map((c) => [c.externalId as string, c]),
    );

    return {
      // "configured" reflects real setup, not the mere existence of the row.
      configured: Boolean(
        integration.appId ||
        integration.appSecretEnc ||
        integration.credentials.length,
      ),
      appId: integration.appId ?? null, // App ID is a public identifier, safe to show
      hasAppSecret: Boolean(integration.appSecretEnc),
      graphApiVersion: integration.graphApiVersion ?? DEFAULT_GRAPH_API_VERSION,
      defaultPageId: integration.defaultPageId ?? null,
      defaultAdAccountId: integration.defaultAdAccountId ?? null,
      webhook: {
        url: metaWebhookUrl(),
        subscribedFields: WEBHOOK_SUBSCRIBED_FIELDS.split(","),
        verifyToken: integration.webhookVerifyToken ?? null,
      },
      credentials: integration.credentials.map((c) => {
        const channel =
          c.kind === MetaCredentialKind.PAGE
            ? channelByPage.get(c.externalId)
            : undefined;
        const meta = (c.metadata ?? {}) as Record<string, unknown>;
        return {
          id: c.id,
          kind: c.kind,
          externalId: c.externalId,
          name: c.name,
          status: c.status,
          metadata: c.metadata,
          tokenConfigured: true, // never expose the token itself
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          // Inbox wiring + linked Instagram account (PAGE only)
          ...(c.kind === MetaCredentialKind.PAGE
            ? {
                inboxChannelId: channel?.id ?? null,
                inboxStatus: channel?.status ?? null,
                webhookSubscribed: meta.webhookSubscribed === true,
                instagram:
                  (meta.instagram as {
                    id?: string;
                    username?: string;
                  } | null) ?? null,
              }
            : {}),
        };
      }),
    };
  }

  async upsertAppCredentials(tenantId: string, dto: UpsertAppCredentialsDto) {
    const data: Record<string, string | null> = {};
    if (dto.appId !== undefined) data.appId = dto.appId ?? null;
    if (dto.graphApiVersion !== undefined)
      data.graphApiVersion = dto.graphApiVersion ?? null;
    if (dto.defaultPageId !== undefined)
      data.defaultPageId = dto.defaultPageId ?? null;
    if (dto.defaultAdAccountId !== undefined)
      data.defaultAdAccountId = dto.defaultAdAccountId
        ? normalizeAdAccountId(dto.defaultAdAccountId)
        : null;
    // appSecret: omitted → keep; blank/whitespace → clear; value → (re)encrypt.
    if (dto.appSecret !== undefined) {
      const trimmed = dto.appSecret.trim();
      data.appSecretEnc = trimmed === "" ? null : encrypt(trimmed);
    }

    await metaIntegrationRepository.upsertIntegration(tenantId, data);
    return this.getSummary(tenantId);
  }

  /** Validate a token against the Graph API (no persistence). */
  async testCredential(
    tenantId: string,
    dto: TestCredentialDto,
  ): Promise<TokenValidationResult> {
    const appSecret = dto.appSecret || (await this.getAppSecret(tenantId));
    return this.validateToken(dto.kind, dto.accessToken, appSecret);
  }

  async addCredential(tenantId: string, dto: AddCredentialDto) {
    const integration =
      await metaIntegrationRepository.ensureIntegration(tenantId);
    const appSecret = integration.appSecretEnc
      ? decrypt(integration.appSecretEnc)
      : undefined;
    const version = integration.graphApiVersion || DEFAULT_GRAPH_API_VERSION;

    // Fail fast if the token is invalid, before we store anything.
    await this.validateToken(dto.kind, dto.accessToken, appSecret);

    const externalId =
      dto.kind === MetaCredentialKind.ADS
        ? normalizeAdAccountId(dto.externalId)
        : dto.externalId.trim();

    let webhookSubscribed = false;
    let webhookNote: string | undefined;
    let instagram: { id: string; username?: string } | null = null;

    // PAGE tokens additionally wire the Messenger inbox: subscribe the page to
    // webhooks and provision a MessagingChannel so the existing inbound pipeline
    // (conversations/messages) works unchanged.
    if (dto.kind === MetaCredentialKind.PAGE) {
      const provisioned = await this.provisionInbox(
        tenantId,
        externalId,
        dto.name,
        dto.accessToken,
        appSecret,
        version,
      );
      webhookSubscribed = provisioned.webhookSubscribed;
      webhookNote = provisioned.note;
      // Cache the linked Instagram Business account so the meta_ig_* tools and
      // the Settings UI don't re-resolve it on every call.
      instagram = await this.resolveLinkedInstagram(
        externalId,
        dto.accessToken,
        appSecret,
        version,
      );
    }

    await metaIntegrationRepository.upsertCredential({
      tenantId,
      integrationId: integration.id,
      kind: dto.kind,
      externalId,
      name: dto.name,
      accessTokenEnc: encrypt(dto.accessToken),
      metadata: {
        validatedAt: new Date().toISOString(),
        ...(dto.kind === MetaCredentialKind.PAGE
          ? { webhookSubscribed, instagram }
          : {}),
      },
    });

    const summary = await this.getSummary(tenantId);
    return { ...summary, ...(webhookNote ? { webhookNote } : {}) };
  }

  async deleteCredential(tenantId: string, id: string) {
    const cred = await metaIntegrationRepository.getCredentialById(
      tenantId,
      id,
    );
    if (!cred) throw createError("Credential not found", 404);

    await metaIntegrationRepository.deleteCredential(tenantId, id);

    // Tear down the linked inbox channel for a removed page.
    if (cred.kind === MetaCredentialKind.PAGE) {
      await this.deprovisionInbox(tenantId, cred.externalId);
    }
    return this.getSummary(tenantId);
  }

  /**
   * Subscribe a page to webhook events and upsert its MessagingChannel so the
   * inbox receives inbound messages. Subscription failures are non-fatal — the
   * credential is still stored; the UI surfaces the note so the user can retry.
   */
  private async provisionInbox(
    tenantId: string,
    pageId: string,
    name: string,
    pageAccessToken: string,
    appSecret: string | undefined,
    version: string,
  ): Promise<{ webhookSubscribed: boolean; note?: string }> {
    // A Facebook page maps to exactly one workspace (MessagingChannel has a
    // global unique (provider, externalId)). Reject up front so we never store
    // an orphan MetaCredential that can't be wired to the inbox.
    const existing = await messagingChannelRepository.findByExternalId(
      "FACEBOOK_MESSENGER",
      pageId,
    );
    if (existing && existing.tenantId !== tenantId) {
      throw createError(
        "This Facebook page is already connected to another workspace. Disconnect it there first.",
        409,
      );
    }

    let webhookSubscribed = false;
    let note: string | undefined;
    try {
      await metaGraphRequest({
        path: `${pageId}/subscribed_apps`,
        method: "POST",
        token: pageAccessToken,
        appSecret,
        version,
        query: { subscribed_fields: WEBHOOK_SUBSCRIBED_FIELDS },
      });
      webhookSubscribed = true;
    } catch (err) {
      note =
        err instanceof Error
          ? `Saved, but webhook subscription failed: ${err.message}`
          : "Saved, but webhook subscription failed.";
      logger.warn(
        "[MetaIntegration] page webhook subscribe failed",
        undefined,
        {
          pageId,
          error: err instanceof Error ? err.message : String(err),
        },
      );
    }

    const credentialsEnc = encrypt(JSON.stringify({ pageAccessToken }));

    if (existing) {
      await messagingChannelRepository.update(existing.id, {
        name,
        credentialsEnc,
        status: "ACTIVE",
        connectedAt: new Date(),
        metadata: { source: "meta-integration", webhookSubscribed },
      });
    } else {
      await messagingChannelRepository.create({
        tenantId,
        provider: "FACEBOOK_MESSENGER",
        name,
        externalId: pageId,
        credentialsEnc,
        webhookVerifyToken: crypto.randomBytes(32).toString("hex"),
        status: "ACTIVE",
        metadata: { source: "meta-integration", webhookSubscribed },
      });
    }
    return { webhookSubscribed, note };
  }

  /** Disconnect the inbox channel when a page credential is removed. */
  private async deprovisionInbox(tenantId: string, pageId: string) {
    const existing = await messagingChannelRepository.findByExternalId(
      "FACEBOOK_MESSENGER",
      pageId,
    );
    if (existing && existing.tenantId === tenantId) {
      await messagingChannelRepository.disconnect(existing.id);
    }
  }

  /**
   * Best-effort: resolve the Instagram Business account linked to a Page.
   * Non-fatal — returns null on any error or when no IG account is linked.
   */
  private async resolveLinkedInstagram(
    pageId: string,
    token: string,
    appSecret: string | undefined,
    version: string,
  ): Promise<{ id: string; username?: string } | null> {
    try {
      const res = await metaGraphRequest<{
        instagram_business_account?: { id: string; username?: string };
      }>({
        path: `${pageId}`,
        token,
        appSecret,
        version,
        query: { fields: "instagram_business_account{id,username}" },
      });
      return res.instagram_business_account ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Hit a cheap Graph endpoint to confirm the token works:
   *  - PAGE → GET /me?fields=id,name,category (a page token resolves to the page)
   *  - ADS  → GET /me/adaccounts (lists the system user's ad accounts)
   * Throws a normalized AppError (e.g. 401 for an invalid/expired token).
   */
  private async validateToken(
    kind: MetaCredentialKind,
    token: string,
    appSecret?: string,
  ): Promise<TokenValidationResult> {
    if (kind === MetaCredentialKind.PAGE) {
      const me = await metaGraphRequest<{
        id: string;
        name?: string;
        category?: string;
      }>({
        path: "me",
        token,
        appSecret,
        query: { fields: "id,name,category" },
      });
      return { kind, page: me };
    }

    const res = await metaGraphRequest<{
      data?: Array<{ id: string; account_id?: string; name?: string }>;
    }>({
      path: "me/adaccounts",
      token,
      appSecret,
      query: { fields: "account_id,name", limit: 25 },
    });
    return { kind, adAccounts: res.data ?? [] };
  }
}

export default new MetaIntegrationService();
