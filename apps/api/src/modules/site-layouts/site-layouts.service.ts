/**
 * site-layouts service — tenant-boundary for block-based layouts.
 *
 * Every mutation:
 *   1. Asserts the tenant has the website feature enabled
 *   2. Writes to the DB via the repository
 *   3. Fires a narrow revalidation (`tenant:<id>:site` + per-scope tag) so
 *      the tenant-site renderer drops its cached layout for this scope
 *
 * Draft vs published: `upsertDraft` writes to `draftBlocks`. The caller must
 * POST /publish to promote. This mirrors the tenant-pages workflow so the
 * editor UX stays consistent.
 */

import { Prisma, type SiteLayout } from "@prisma/client";
import sitesRepo from "@/modules/sites/sites.repository";
import { createError } from "@/middlewares/errorHandler";
import { env } from "@/config/env";
import { BlockTreeSchema } from "@repo/shared";
import {
  signSitePreviewToken,
  verifySitePreviewToken,
  parseSitePreviewTokenBody,
} from "@/modules/site-preview/preview-token";
import {
  storePreviewNonce,
  checkPreviewNonce,
  revokePreviewNonce,
} from "@/modules/site-preview/preview-nonce";
import defaultPagesRepo from "@/modules/pages/pages.repository";
import { getTemplateBlueprint } from "@/modules/sites/blueprints";
import defaultRepo, { type SiteLayoutKey } from "./site-layouts.repository";
import { revalidateSiteLayout as defaultRevalidate } from "./site-layouts.revalidate";
import type { UpsertSiteLayoutInput } from "./site-layouts.schema";

type Repo = typeof defaultRepo;
type SitesRepo = typeof sitesRepo;
type Revalidate = (tenantId: string, scope: string) => Promise<void>;

export class SiteLayoutsService {
  constructor(
    private readonly repo: Repo = defaultRepo,
    private readonly sites: SitesRepo = sitesRepo,
    private readonly revalidate: Revalidate = defaultRevalidate,
  ) {}

  private async assertEnabled(tenantId: string): Promise<void> {
    const config = await this.sites.findConfig(tenantId);
    if (!config) {
      throw createError("Website feature is not enabled for this tenant.", 403);
    }
    if (!config.websiteEnabled) {
      throw createError("Website feature is disabled for this tenant.", 403);
    }
  }

  async list(
    tenantId: string,
    opts: { scope?: string } = {},
  ): Promise<SiteLayout[]> {
    await this.assertEnabled(tenantId);
    return this.repo.listForTenant(tenantId, opts);
  }

  async get(tenantId: string, key: SiteLayoutKey): Promise<SiteLayout> {
    await this.assertEnabled(tenantId);
    const row = await this.repo.findByKey(tenantId, key);
    if (!row) throw createError("Layout not found", 404);
    return row;
  }

  async upsertDraft(
    tenantId: string,
    input: UpsertSiteLayoutInput,
  ): Promise<SiteLayout> {
    await this.assertEnabled(tenantId);
    const parsed = BlockTreeSchema.safeParse(input.blocks);
    if (!parsed.success) {
      throw createError(
        `Invalid block tree: ${parsed.error.issues[0]?.message ?? "unknown"}`,
        400,
      );
    }
    const row = await this.repo.upsertDraft(
      tenantId,
      { scope: input.scope, pageId: input.pageId ?? null },
      parsed.data as unknown as Prisma.InputJsonValue,
    );
    await this.revalidate(tenantId, input.scope);
    return row;
  }

  async publishDraft(
    tenantId: string,
    key: SiteLayoutKey,
  ): Promise<SiteLayout> {
    await this.assertEnabled(tenantId);
    const row = await this.repo.publishDraft(tenantId, key);
    if (!row) throw createError("Layout not found", 404);
    await this.revalidate(tenantId, key.scope);
    return row;
  }

  async deleteLayout(tenantId: string, key: SiteLayoutKey): Promise<void> {
    await this.assertEnabled(tenantId);
    const res = await this.repo.deleteByKey(tenantId, key);
    if (res.count === 0) throw createError("Layout not found", 404);
    await this.revalidate(tenantId, key.scope);
  }

  /**
   * Mint a short-lived preview URL the Framer-lite editor can drop into an
   * iframe. The URL points at /preview/site/:scope on the tenant-site renderer
   * with an HMAC token bound to (tenantId, scope, pageId?).
   *
   * Issue #429: also stores the nonce in Redis so it can be verified and
   * revoked server-side without rotating the HMAC secret.
   */
  async mintPreviewUrl(
    tenantId: string,
    key: SiteLayoutKey,
  ): Promise<{ url: string }> {
    await this.assertEnabled(tenantId);

    const hostname =
      await defaultPagesRepo.findPrimaryWebsiteHostname(tenantId);
    const baseUrl = hostname ? `https://${hostname}` : env.tenantSitePublicUrl;
    if (!baseUrl) {
      throw createError(
        "No preview target available: no verified primary website domain and TENANT_SITE_PUBLIC_URL is not configured.",
        503,
      );
    }

    const { token, nonce, ttlSeconds } = signSitePreviewToken({
      tenantId,
      scope: key.scope,
      pageId: key.pageId ?? undefined,
    });

    await storePreviewNonce(
      tenantId,
      nonce,
      {
        scope: key.scope,
        pageId: key.pageId ?? null,
        iat: Math.floor(Date.now() / 1000),
      },
      ttlSeconds,
    );

    const pageSuffix = key.pageId
      ? `&pageId=${encodeURIComponent(key.pageId)}`
      : "";
    return {
      url: `${baseUrl.replace(/\/+$/, "")}/preview/site/${encodeURIComponent(
        key.scope,
      )}?token=${encodeURIComponent(token)}${pageSuffix}`,
    };
  }

  /**
   * Refresh a preview token. Verifies the current token (HMAC + exp + Redis
   * nonce), issues a new token for the same (tenantId, scope, pageId) tuple,
   * and stores the new nonce. The old nonce remains valid until its natural TTL
   * — it is NOT revoked here to avoid race conditions with in-flight preview
   * requests during the transition.
   *
   * Used by the editor to extend the session on activity (each save).
   * Auth: the caller's tenantId must match the token's tenantId (IDOR guard).
   */
  async refreshPreviewToken(
    callerTenantId: string,
    currentToken: string,
  ): Promise<{ url: string }> {
    const payload = verifySitePreviewToken(currentToken);
    if (!payload) {
      throw createError(
        "Preview link expired or revoked. Generate a new preview from the editor.",
        401,
      );
    }
    if (payload.tenantId !== callerTenantId) {
      throw createError(
        "Cannot refresh a preview token for another tenant.",
        403,
      );
    }

    const nonceValid = await checkPreviewNonce(payload.tenantId, payload.nonce);
    if (!nonceValid) {
      throw createError(
        "Preview link expired or revoked. Generate a new preview from the editor.",
        401,
      );
    }

    await this.assertEnabled(callerTenantId);

    const hostname =
      await defaultPagesRepo.findPrimaryWebsiteHostname(callerTenantId);
    const baseUrl = hostname ? `https://${hostname}` : env.tenantSitePublicUrl;
    if (!baseUrl) {
      throw createError(
        "No preview target available: no verified primary website domain and TENANT_SITE_PUBLIC_URL is not configured.",
        503,
      );
    }

    const {
      token: newToken,
      nonce: newNonce,
      ttlSeconds,
    } = signSitePreviewToken({
      tenantId: payload.tenantId,
      scope: payload.scope,
      pageId: payload.pageId,
    });

    await storePreviewNonce(
      payload.tenantId,
      newNonce,
      {
        scope: payload.scope,
        pageId: payload.pageId ?? null,
        iat: Math.floor(Date.now() / 1000),
      },
      ttlSeconds,
    );

    const pageSuffix = payload.pageId
      ? `&pageId=${encodeURIComponent(payload.pageId)}`
      : "";
    return {
      url: `${baseUrl.replace(/\/+$/, "")}/preview/site/${encodeURIComponent(
        payload.scope,
      )}?token=${encodeURIComponent(newToken)}${pageSuffix}`,
    };
  }

  /**
   * Invalidate a preview token by revoking its Redis nonce. Accepts expired
   * tokens (exp is not checked) so the editor can clean up even after a long
   * session. HMAC + tenantId IDOR guard are still enforced.
   *
   * Used when the user closes the editor or signs out.
   */
  async invalidatePreviewToken(
    callerTenantId: string,
    token: string,
  ): Promise<void> {
    const payload = parseSitePreviewTokenBody(token);
    if (!payload) {
      // Malformed or tampered token — silently ignore.
      return;
    }
    if (payload.tenantId !== callerTenantId) {
      throw createError(
        "Cannot invalidate a preview token for another tenant.",
        403,
      );
    }
    await revokePreviewNonce(payload.tenantId, payload.nonce);
  }

  /**
   * Reset a single scope's draftBlocks to the tenant's current template blueprint.
   */
  async resetScopeFromTemplate(
    tenantId: string,
    key: SiteLayoutKey,
  ): Promise<SiteLayout> {
    await this.assertEnabled(tenantId);

    const config = await this.sites.findConfig(tenantId);
    if (!config?.template?.slug) {
      throw createError(
        "Pick a template first — there's no blueprint to reset from.",
        400,
      );
    }

    const blueprint = getTemplateBlueprint(config.template.slug);
    if (!blueprint) {
      throw createError(
        `No blueprint registered for template "${config.template.slug}".`,
        404,
      );
    }

    const blocks =
      blueprint.layouts[key.scope as keyof typeof blueprint.layouts];
    if (!blocks || blocks.length === 0) {
      throw createError(
        `Template "${config.template.slug}" has no blueprint for scope "${key.scope}".`,
        404,
      );
    }

    const row = await this.repo.upsertDraft(
      tenantId,
      { scope: key.scope, pageId: key.pageId ?? null },
      blocks as unknown as Prisma.InputJsonValue,
    );
    await this.revalidate(tenantId, key.scope);
    return row;
  }
}

export default new SiteLayoutsService();
