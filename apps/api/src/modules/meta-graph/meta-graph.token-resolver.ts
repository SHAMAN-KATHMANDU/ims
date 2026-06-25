/**
 * Resolves the per-tenant Meta credentials needed for a Graph call.
 *
 * Credentials are bring-your-own-app, stored encrypted by the meta-integration
 * settings module. This layer turns a tenant + an optional page/ad-account
 * selector into a concrete { token, appSecret, version }. When the selector is
 * ambiguous or missing it throws an error carrying `availableOptions`, which
 * mcpErrorResponse surfaces so the model can call meta_page_list /
 * meta_ad_accounts_list and retry.
 */

import { MetaCredentialKind } from "@prisma/client";
import { createError, type AppError } from "@/middlewares/errorHandler";
import { decrypt } from "@/utils/encryption";
import metaIntegrationRepository from "@/modules/meta-integration/meta-integration.repository";
import {
  DEFAULT_GRAPH_API_VERSION,
  metaGraphRequest,
} from "./meta-graph.client";

export interface ResolvedMetaToken {
  /** Decrypted access token (Page token or Ads system-user token). */
  token: string;
  /** Decrypted App Secret for appsecret_proof, if the tenant configured one. */
  appSecret?: string;
  /** Graph API version to use (per-tenant override or the code default). */
  version: string;
  /** The selected page id (PAGE) or ad-account id without "act_" (ADS). */
  externalId: string;
  /** Human label of the selected credential. */
  name: string;
}

type AppErrorWithOptions = AppError & {
  availableOptions?: Array<{ id: string; name: string }>;
  referenceKind?: string;
};

function ambiguousError(
  kind: MetaCredentialKind,
  options: Array<{ id: string; name: string }>,
  selectorProvided: boolean,
): AppErrorWithOptions {
  const label = kind === MetaCredentialKind.PAGE ? "page" : "ad account";
  const param = kind === MetaCredentialKind.PAGE ? "pageId" : "adAccountId";
  const listTool =
    kind === MetaCredentialKind.PAGE
      ? "meta_page_list"
      : "meta_ad_accounts_list";
  const msg = selectorProvided
    ? `No connected ${label} matches that ${param}. Use ${listTool} to see the configured options.`
    : `Multiple ${label}s are connected — pass ${param} to choose one (see ${listTool}).`;
  const err = createError(
    msg,
    400,
    "META_AMBIGUOUS_SELECTOR",
  ) as AppErrorWithOptions;
  err.availableOptions = options;
  err.referenceKind = param;
  return err;
}

/** App-level context (App Secret + version) even when no token is required. */
export async function resolveAppContext(
  tenantId: string,
): Promise<{ appSecret?: string; version: string; appId?: string }> {
  const integration = await metaIntegrationRepository.getIntegration(tenantId);
  return {
    appSecret: integration?.appSecretEnc
      ? decrypt(integration.appSecretEnc)
      : undefined,
    version: integration?.graphApiVersion || DEFAULT_GRAPH_API_VERSION,
    appId: integration?.appId ?? undefined,
  };
}

async function resolve(
  tenantId: string,
  kind: MetaCredentialKind,
  selector: string | undefined,
): Promise<ResolvedMetaToken> {
  const integration = await metaIntegrationRepository.getIntegration(tenantId);
  const version = integration?.graphApiVersion || DEFAULT_GRAPH_API_VERSION;
  const appSecret = integration?.appSecretEnc
    ? decrypt(integration.appSecretEnc)
    : undefined;

  const creds = await metaIntegrationRepository.getCredentialsByKind(
    tenantId,
    kind,
  );

  if (creds.length === 0) {
    const label = kind === MetaCredentialKind.PAGE ? "Facebook Page" : "Ads";
    throw createError(
      `No ${label} access token is configured. Add one in Settings → Facebook / Meta.`,
      400,
      "META_NOT_CONFIGURED",
    );
  }

  const normalizedSelector =
    kind === MetaCredentialKind.ADS && selector
      ? selector.replace(/^act_/i, "").trim()
      : selector?.trim();

  const options = creds.map((c) => ({ id: c.externalId, name: c.name }));

  let chosen = creds[0];
  if (normalizedSelector) {
    const match = creds.find((c) => c.externalId === normalizedSelector);
    if (!match) throw ambiguousError(kind, options, true);
    chosen = match;
  } else {
    const defaultId =
      kind === MetaCredentialKind.PAGE
        ? integration?.defaultPageId
        : integration?.defaultAdAccountId;
    if (defaultId) {
      const match = creds.find((c) => c.externalId === defaultId);
      if (match) chosen = match;
    } else if (creds.length > 1) {
      throw ambiguousError(kind, options, false);
    }
  }

  return {
    token: decrypt(chosen.accessTokenEnc),
    appSecret,
    version,
    externalId: chosen.externalId,
    name: chosen.name,
  };
}

export function resolvePageToken(
  tenantId: string,
  opts: { pageId?: string } = {},
): Promise<ResolvedMetaToken> {
  return resolve(tenantId, MetaCredentialKind.PAGE, opts.pageId);
}

export function resolveAdsToken(
  tenantId: string,
  opts: { adAccountId?: string } = {},
): Promise<ResolvedMetaToken> {
  return resolve(tenantId, MetaCredentialKind.ADS, opts.adAccountId);
}

// ── Instagram ───────────────────────────────────────────────────────────────
// Instagram Business/Creator accounts are reached through the linked Facebook
// Page using the SAME Page token. We resolve the Page token, then the linked IG
// account id (stored on the PAGE credential's metadata, with a live fallback).

export interface ResolvedInstagramAccount {
  token: string;
  appSecret?: string;
  version: string;
  /** The Instagram Business account id — the node for all IG calls. */
  igUserId: string;
  igUsername?: string;
  /** The Facebook Page the IG account is linked to. */
  pageId: string;
  name: string;
}

/** `metadata.instagram` shape stored on a PAGE credential when connected. */
function readStoredIg(
  metadata: unknown,
): { id?: string; username?: string } | undefined {
  const ig = (metadata as Record<string, unknown> | null)?.instagram;
  return ig && typeof ig === "object"
    ? (ig as { id?: string; username?: string })
    : undefined;
}

function igAmbiguousError(
  options: Array<{ id: string; name: string }>,
  selectorProvided: boolean,
): AppErrorWithOptions {
  const msg = selectorProvided
    ? "No connected Page matches that pageId/igUserId. Use meta_ig_list to see the configured options."
    : "Multiple Pages are connected — pass pageId (or igUserId) to choose one (see meta_ig_list).";
  const err = createError(
    msg,
    400,
    "META_AMBIGUOUS_SELECTOR",
  ) as AppErrorWithOptions;
  err.availableOptions = options;
  err.referenceKind = "pageId";
  return err;
}

export async function resolveInstagramAccount(
  tenantId: string,
  opts: { pageId?: string; igUserId?: string } = {},
): Promise<ResolvedInstagramAccount> {
  const integration = await metaIntegrationRepository.getIntegration(tenantId);
  const version = integration?.graphApiVersion || DEFAULT_GRAPH_API_VERSION;
  const appSecret = integration?.appSecretEnc
    ? decrypt(integration.appSecretEnc)
    : undefined;

  const creds = await metaIntegrationRepository.getCredentialsByKind(
    tenantId,
    MetaCredentialKind.PAGE,
  );
  if (creds.length === 0) {
    throw createError(
      "No Facebook Page is configured. Add one in Settings → Facebook / Meta (its linked Instagram account is used).",
      400,
      "META_NOT_CONFIGURED",
    );
  }

  const options = creds.map((c) => ({ id: c.externalId, name: c.name }));
  const pageSel = opts.pageId?.trim();
  const igSel = opts.igUserId?.trim();

  let chosen = creds[0];
  if (igSel) {
    const match = creds.find((c) => readStoredIg(c.metadata)?.id === igSel);
    if (!match) throw igAmbiguousError(options, true);
    chosen = match;
  } else if (pageSel) {
    const match = creds.find((c) => c.externalId === pageSel);
    if (!match) throw igAmbiguousError(options, true);
    chosen = match;
  } else if (integration?.defaultPageId) {
    chosen =
      creds.find((c) => c.externalId === integration.defaultPageId) ?? chosen;
  } else if (creds.length > 1) {
    throw igAmbiguousError(options, false);
  }

  const token = decrypt(chosen.accessTokenEnc);

  // Stored IG account first; otherwise resolve live from the Page.
  let ig = readStoredIg(chosen.metadata);
  if (!ig?.id) {
    const live = await metaGraphRequest<{
      instagram_business_account?: { id: string; username?: string };
    }>({
      path: `${chosen.externalId}`,
      token,
      appSecret,
      version,
      query: { fields: "instagram_business_account{id,username}" },
    });
    ig = live.instagram_business_account;
  }

  if (!ig?.id) {
    throw createError(
      `The Facebook Page "${chosen.name}" has no linked Instagram Business account. Link one in the Page's settings, then reconnect the Page.`,
      400,
      "META_NO_IG_ACCOUNT",
    );
  }

  return {
    token,
    appSecret,
    version,
    igUserId: ig.id,
    igUsername: ig.username,
    pageId: chosen.externalId,
    name: chosen.name,
  };
}
