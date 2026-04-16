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
import { signSitePreviewToken } from "@/modules/site-preview/preview-token";
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
    // Re-validate the block tree at the service boundary even though the
    // controller already parsed it — defence in depth + helpful error shape.
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
   * iframe. The URL points at /preview/site/:scope on the tenant-site
   * renderer with an HMAC token bound to (tenantId, scope, pageId?). The
   * tenant-site route returns the DRAFT SiteLayout for that scope — or
   * falls back to the published tree if no draft exists — so the editor
   * sees edits as soon as they're saved.
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

    const token = signSitePreviewToken({
      tenantId,
      scope: key.scope,
      pageId: key.pageId ?? undefined,
    });

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
   * Reset a single scope's draftBlocks to the tenant's current template
   * blueprint. Used by the editor's "Reset to template default" button —
   * lets a tenant throw away their edits and start from the blueprint
   * again without re-picking the whole template. The published `blocks`
   * column is left alone; the tenant still has to hit Publish to promote.
   *
   * 400 if the tenant has no template picked; 404 if their template has
   * no registered blueprint (unusual — a blueprint should exist for every
   * shipping template).
   */
  async resetScopeFromTemplate(
    tenantId: string,
    key: SiteLayoutKey,
  ): Promise<SiteLayout> {
    await this.assertEnabled(tenantId);

    const config = await sitesRepo.findConfig(tenantId);
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
