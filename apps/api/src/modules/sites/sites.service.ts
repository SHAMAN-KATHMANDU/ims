/**
 * Tenant-scoped site service — lets tenant admins manage their own website
 * content once the platform has enabled the feature for them.
 *
 * All methods take an explicit `tenantId` and assert the website feature is
 * enabled before any mutation; platform-level concerns (enabling the feature,
 * picking domains) are handled elsewhere.
 */

import { Prisma, type SiteTemplate } from "@prisma/client";
import { createError } from "@/middlewares/errorHandler";
import defaultRepo, { type SiteConfigWithTemplate } from "./sites.repository";
import type {
  UpdateSiteConfigInput,
  PickTemplateInput,
  CreatePageInput,
  UpdatePageInput,
  UpsertBlocksInput,
  UpdateGlobalsInput,
  UpdateThemeInput,
  UpdateSeoInput,
  AnalyticsInput,
} from "./sites.schema";
import { revalidateTenantSite as defaultRevalidate } from "./sites.revalidate";
import siteLayoutsRepo from "@/modules/site-layouts/site-layouts.repository";
import { revalidateSiteLayout } from "@/modules/site-layouts/site-layouts.revalidate";
import {
  getTemplateBlueprint,
  BLUEPRINT_SCOPES,
  type TemplateBlueprint,
} from "./blueprints";
import type { BlockNode, BlockTree } from "@repo/shared";

type Repo = typeof defaultRepo;
type Revalidate = (tenantId: string) => Promise<void>;

/**
 * Identity fields that live in TenantBusinessProfile, NOT in SiteConfig.branding.
 * When applying a template we must never overwrite these with template defaults —
 * the tenant's logo, name and contact details must survive a template switch.
 */
const BRANDING_IDENTITY_KEYS = [
  "name",
  "tagline",
  "logoUrl",
  "faviconUrl",
] as const;

/**
 * Strip identity fields from a raw branding JSON object before it is written
 * to SiteConfig. Handles null safely (returns null).
 */
function stripIdentityFromBranding(
  raw: unknown,
): Record<string, unknown> | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const result = { ...(raw as Record<string, unknown>) };
  for (const key of BRANDING_IDENTITY_KEYS) {
    delete result[key];
  }
  return result;
}

function assertEnabled(config: SiteConfigWithTemplate | null): asserts config {
  if (!config) {
    throw createError(
      "Website feature is not enabled for this tenant. Contact your platform administrator.",
      403,
    );
  }
  if (!config.websiteEnabled) {
    throw createError(
      "Website feature is disabled for this tenant. Contact your platform administrator.",
      403,
    );
  }
}

export class SitesService {
  constructor(
    private readonly repo: Repo = defaultRepo,
    private readonly revalidate: Revalidate = defaultRevalidate,
  ) {}

  async getConfig(tenantId: string): Promise<SiteConfigWithTemplate> {
    const config = await this.repo.findConfig(tenantId);
    assertEnabled(config);
    return config;
  }

  async updateConfig(
    tenantId: string,
    input: UpdateSiteConfigInput,
  ): Promise<SiteConfigWithTemplate> {
    const current = await this.repo.findConfig(tenantId);
    assertEnabled(current);

    const toJson = (
      v: Record<string, unknown> | null | undefined,
    ): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined => {
      if (v === undefined) return undefined;
      if (v === null) return Prisma.JsonNull;
      return v as Prisma.InputJsonValue;
    };

    const data: Prisma.SiteConfigUpdateInput = {};
    if (input.branding !== undefined) data.branding = toJson(input.branding);
    if (input.contact !== undefined) data.contact = toJson(input.contact);
    if (input.features !== undefined) data.features = toJson(input.features);
    if (input.seo !== undefined) data.seo = toJson(input.seo);
    if (input.themeTokens !== undefined)
      data.themeTokens = toJson(input.themeTokens);
    if (input.currency !== undefined) data.currency = input.currency;

    const result = await this.repo.updateConfig(tenantId, data);
    await this.revalidate(tenantId);
    return result;
  }

  async listTemplates(tenantId: string): Promise<SiteTemplate[]> {
    // Gate the template catalog on the feature flag too, so tenants who can't
    // use the website feature don't see templates they can't apply.
    const config = await this.repo.findConfig(tenantId);
    assertEnabled(config);
    return this.repo.listActiveTemplates();
  }

  async pickTemplate(
    tenantId: string,
    input: PickTemplateInput,
  ): Promise<SiteConfigWithTemplate> {
    const current = await this.repo.findConfig(tenantId);
    assertEnabled(current);

    const template = await this.repo.findTemplateBySlug(input.templateSlug);
    if (!template) throw createError("Template not found", 404);
    if (!template.isActive) throw createError("Template is not active", 400);

    const data: Prisma.SiteConfigUpdateInput = {
      template: { connect: { id: template.id } },
    };
    if (input.resetBranding) {
      // Strip identity fields (name/tagline/logoUrl/faviconUrl) from the
      // template's default branding before writing — those belong to
      // TenantBusinessProfile and must survive a template switch.
      const strippedBranding = stripIdentityFromBranding(
        template.defaultBranding,
      );
      data.branding =
        strippedBranding === null
          ? Prisma.JsonNull
          : (strippedBranding as Prisma.InputJsonValue);
      data.features =
        template.defaultSections === null
          ? Prisma.JsonNull
          : (template.defaultSections as Prisma.InputJsonValue);
    }

    const blueprint = getTemplateBlueprint(input.templateSlug);
    if (blueprint?.defaultThemeTokens) {
      const existingTokens = current?.themeTokens as Record<
        string,
        unknown
      > | null;
      if (!existingTokens || input.resetBranding) {
        data.themeTokens =
          blueprint.defaultThemeTokens as Prisma.InputJsonValue;
      }
    }

    const result = await this.repo.updateConfig(tenantId, data);

    // Seed a SiteLayout row for every scope the blueprint covers. The
    // repository's upsertDraft writes to `draftBlocks`, so on first pick
    // the tenant opens the block editor and sees the template's starter
    // layout as a draft they can edit + publish. Re-picking the same
    // template updates the draft idempotently. Re-picking a DIFFERENT
    // template overwrites drafts — we don't clobber published `blocks`
    // unless the tenant explicitly asks via resetBranding (Phase 9+
    // could add a `resetLayouts` flag; for now resetBranding implies it
    // because it's the strongest "I want a clean slate" signal).
    if (blueprint) {
      await this.seedLayoutsFromBlueprint(
        tenantId,
        blueprint,
        input.resetBranding === true,
      );
    }

    await this.revalidate(tenantId);
    return result;
  }

  /**
   * Seed draft SiteLayout rows from a template blueprint. When
   * `publishNow` is true (e.g. the tenant explicitly reset to defaults),
   * the blueprint is written straight to `blocks` so the site reflects
   * the new template on next page load; otherwise it lands in
   * `draftBlocks` and the tenant has to hit Publish in the editor.
   */
  private async seedLayoutsFromBlueprint(
    tenantId: string,
    blueprint: TemplateBlueprint,
    publishNow: boolean,
  ): Promise<void> {
    for (const scope of BLUEPRINT_SCOPES) {
      const blocks = blueprint.layouts[scope];
      if (!blocks || blocks.length === 0) continue;

      const json = blocks as unknown as Prisma.InputJsonValue;

      if (publishNow) {
        // Write to both draft and published so the site reflects the new
        // template immediately AND the editor opens on the same tree.
        await siteLayoutsRepo.upsertDraft(
          tenantId,
          { scope, pageId: null },
          json,
        );
        await siteLayoutsRepo.publishDraft(tenantId, { scope, pageId: null });
      } else {
        await siteLayoutsRepo.upsertDraft(
          tenantId,
          { scope, pageId: null },
          json,
        );
      }

      await revalidateSiteLayout(tenantId, scope);
    }
  }

  async publish(tenantId: string): Promise<SiteConfigWithTemplate> {
    const current = await this.repo.findConfig(tenantId);
    assertEnabled(current);

    if (!current.templateId) {
      throw createError("Pick a template before publishing your site.", 400);
    }

    // Atomically promote all draft layouts and flip config in one transaction
    const { siteConfig } = await this.repo.publishAllDrafts(tenantId);
    await this.revalidate(tenantId);
    return siteConfig;
  }

  async unpublish(tenantId: string): Promise<SiteConfigWithTemplate> {
    const current = await this.repo.findConfig(tenantId);
    assertEnabled(current);
    const result = await this.repo.updateConfig(tenantId, {
      isPublished: false,
    });
    await this.revalidate(tenantId);
    return result;
  }

  // ——— PAGES ———

  async listPages(tenantId: string) {
    const config = await this.repo.findConfig(tenantId);
    assertEnabled(config);
    // For now, pages are accessed via SiteLayout rows where pageId is not null.
    // Future implementation can add a dedicated SitePage table if needed.
    return [];
  }

  async getPage(tenantId: string, _pageId: string) {
    const config = await this.repo.findConfig(tenantId);
    assertEnabled(config);
    // Placeholder: fetch page metadata and blocks from SiteLayout
    throw createError("Not implemented", 501);
  }

  async createPage(tenantId: string, _input: CreatePageInput) {
    const config = await this.repo.findConfig(tenantId);
    assertEnabled(config);
    // Placeholder: create a custom page and seed SiteLayout with empty blocks
    throw createError("Not implemented", 501);
  }

  async updatePage(tenantId: string, _pageId: string, _input: UpdatePageInput) {
    const config = await this.repo.findConfig(tenantId);
    assertEnabled(config);
    throw createError("Not implemented", 501);
  }

  async deletePage(tenantId: string, _pageId: string) {
    const config = await this.repo.findConfig(tenantId);
    assertEnabled(config);
    throw createError("Not implemented", 501);
  }

  // ——— BLOCKS ———

  async upsertBlocks(
    tenantId: string,
    input: UpsertBlocksInput,
  ): Promise<BlockTree> {
    const config = await this.repo.findConfig(tenantId);
    assertEnabled(config);

    const scope = input.scope || "home";
    const blocks = input.blocks as unknown as Prisma.InputJsonValue;
    await siteLayoutsRepo.upsertDraft(
      tenantId,
      { scope, pageId: input.pageId },
      blocks,
    );
    await revalidateSiteLayout(tenantId, scope);
    return input.blocks;
  }

  async addBlock(
    tenantId: string,
    input: {
      pageId: string | null;
      scope: string;
      block: BlockNode;
    },
  ): Promise<BlockTree> {
    const config = await this.repo.findConfig(tenantId);
    assertEnabled(config);

    const layout = await siteLayoutsRepo.findByKey(tenantId, {
      scope: input.scope,
      pageId: input.pageId,
    });
    const current = (layout?.draftBlocks ??
      layout?.blocks ??
      []) as unknown as BlockTree;
    const updated = [...current, input.block];

    await siteLayoutsRepo.upsertDraft(
      tenantId,
      { scope: input.scope, pageId: input.pageId },
      updated as unknown as Prisma.InputJsonValue,
    );
    await revalidateSiteLayout(tenantId, input.scope);
    return updated;
  }

  async updateBlock(
    tenantId: string,
    input: {
      pageId: string | null;
      scope: string;
      blockId: string;
      props?: Record<string, unknown>;
      style?: Record<string, unknown> | null;
      visibility?: Record<string, unknown>;
    },
  ): Promise<BlockTree> {
    const config = await this.repo.findConfig(tenantId);
    assertEnabled(config);

    const layout = await siteLayoutsRepo.findByKey(tenantId, {
      scope: input.scope,
      pageId: input.pageId,
    });
    const current = (layout?.draftBlocks ??
      layout?.blocks ??
      []) as unknown as BlockTree;

    const updated = current.map((block: BlockNode) => {
      if (block.id === input.blockId) {
        return {
          ...block,
          ...(input.props !== undefined && { props: input.props }),
          ...(input.style !== undefined && { style: input.style }),
          ...(input.visibility !== undefined && {
            visibility: input.visibility,
          }),
        };
      }
      return block;
    });

    await siteLayoutsRepo.upsertDraft(
      tenantId,
      { scope: input.scope, pageId: input.pageId },
      updated as unknown as Prisma.InputJsonValue,
    );
    await revalidateSiteLayout(tenantId, input.scope);
    return updated;
  }

  async deleteBlock(
    tenantId: string,
    input: {
      pageId: string | null;
      scope: string;
      blockId: string;
    },
  ): Promise<BlockTree> {
    const config = await this.repo.findConfig(tenantId);
    assertEnabled(config);

    const layout = await siteLayoutsRepo.findByKey(tenantId, {
      scope: input.scope,
      pageId: input.pageId,
    });
    const current = (layout?.draftBlocks ??
      layout?.blocks ??
      []) as unknown as BlockTree;
    const updated = current.filter(
      (block: BlockNode) => block.id !== input.blockId,
    );

    await siteLayoutsRepo.upsertDraft(
      tenantId,
      { scope: input.scope, pageId: input.pageId },
      updated as unknown as Prisma.InputJsonValue,
    );
    await revalidateSiteLayout(tenantId, input.scope);
    return updated;
  }

  async reorderBlocks(
    tenantId: string,
    input: {
      pageId: string | null;
      scope: string;
      blockIds: string[];
    },
  ): Promise<BlockTree> {
    const config = await this.repo.findConfig(tenantId);
    assertEnabled(config);

    const layout = await siteLayoutsRepo.findByKey(tenantId, {
      scope: input.scope,
      pageId: input.pageId,
    });
    const current = (layout?.draftBlocks ??
      layout?.blocks ??
      []) as unknown as BlockTree;

    // Reorder blocks according to blockIds
    const blockMap = new Map(current.map((b: BlockNode) => [b.id, b]));
    const updated: BlockTree = [];
    for (const id of input.blockIds) {
      const block = blockMap.get(id);
      if (block) {
        updated.push(block);
      }
    }
    // Append any blocks that weren't in the reorder list (shouldn't happen in normal flow)
    for (const block of current) {
      if (!updated.find((b) => b.id === block.id)) {
        updated.push(block);
      }
    }

    await siteLayoutsRepo.upsertDraft(
      tenantId,
      { scope: input.scope, pageId: input.pageId },
      updated as unknown as Prisma.InputJsonValue,
    );
    await revalidateSiteLayout(tenantId, input.scope);
    return updated;
  }

  // ——— GLOBALS (Header/Footer) ———

  async getGlobals(tenantId: string) {
    const config = await this.repo.findConfig(tenantId);
    assertEnabled(config);

    const headerLayout = await siteLayoutsRepo.findByKey(tenantId, {
      scope: "header",
      pageId: null,
    });
    const footerLayout = await siteLayoutsRepo.findByKey(tenantId, {
      scope: "footer",
      pageId: null,
    });

    return {
      header: (headerLayout?.draftBlocks ??
        headerLayout?.blocks ??
        []) as unknown as BlockTree,
      footer: (footerLayout?.draftBlocks ??
        footerLayout?.blocks ??
        []) as unknown as BlockTree,
    };
  }

  async updateGlobals(tenantId: string, input: UpdateGlobalsInput) {
    const config = await this.repo.findConfig(tenantId);
    assertEnabled(config);

    if (input.header !== undefined) {
      await siteLayoutsRepo.upsertDraft(
        tenantId,
        { scope: "header", pageId: null },
        input.header as unknown as Prisma.InputJsonValue,
      );
      await revalidateSiteLayout(tenantId, "header");
    }

    if (input.footer !== undefined) {
      await siteLayoutsRepo.upsertDraft(
        tenantId,
        { scope: "footer", pageId: null },
        input.footer as unknown as Prisma.InputJsonValue,
      );
      await revalidateSiteLayout(tenantId, "footer");
    }

    return this.getGlobals(tenantId);
  }

  // ——— THEME ———

  async getTheme(tenantId: string) {
    const config = await this.repo.findConfig(tenantId);
    assertEnabled(config);
    return config.themeTokens ?? {};
  }

  async updateTheme(tenantId: string, input: UpdateThemeInput) {
    const config = await this.repo.findConfig(tenantId);
    assertEnabled(config);

    const current = (config.themeTokens ?? {}) as Record<string, unknown>;
    const merged = {
      colors: {
        ...((current.colors as Record<string, unknown>) ?? {}),
        ...input.colors,
      },
      typography: {
        ...((current.typography as Record<string, unknown>) ?? {}),
        ...input.typography,
      },
      layout: {
        ...((current.layout as Record<string, unknown>) ?? {}),
        ...input.layout,
      },
    };

    const result = await this.repo.updateConfig(tenantId, {
      themeTokens: merged as Prisma.InputJsonValue,
    });
    await this.revalidate(tenantId);
    return result.themeTokens ?? {};
  }

  // ——— SEO ———

  async getSeo(tenantId: string) {
    const config = await this.repo.findConfig(tenantId);
    assertEnabled(config);
    return config.seo ?? {};
  }

  async updateSeo(tenantId: string, input: UpdateSeoInput) {
    const config = await this.repo.findConfig(tenantId);
    assertEnabled(config);

    const current = (config.seo ?? {}) as Record<string, unknown>;
    const merged = {
      ...current,
      ...(input.siteTitle !== undefined && { siteTitle: input.siteTitle }),
      ...(input.siteDescription !== undefined && {
        siteDescription: input.siteDescription,
      }),
      ...(input.gaId !== undefined && { gaId: input.gaId }),
      ...(input.robots !== undefined && { robots: input.robots }),
    };

    const result = await this.repo.updateConfig(tenantId, {
      seo: merged as Prisma.InputJsonValue,
    });
    await this.revalidate(tenantId);
    return result.seo ?? {};
  }

  // ——— ANALYTICS ———

  async getAnalytics(tenantId: string): Promise<Record<string, unknown>> {
    const config = await this.repo.findConfig(tenantId);
    assertEnabled(config);
    return (config.analytics ?? {}) as Record<string, unknown>;
  }

  async updateAnalytics(
    tenantId: string,
    input: AnalyticsInput,
  ): Promise<Record<string, unknown>> {
    const config = await this.repo.findConfig(tenantId);
    assertEnabled(config);

    const current = (config.analytics ?? {}) as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...current };
    if (input.ga4MeasurementId !== undefined)
      merged.ga4MeasurementId = input.ga4MeasurementId;
    if (input.gtmContainerId !== undefined)
      merged.gtmContainerId = input.gtmContainerId;
    if (input.metaPixelId !== undefined) merged.metaPixelId = input.metaPixelId;
    if (input.consentMode !== undefined) merged.consentMode = input.consentMode;

    const result = await this.repo.updateConfig(tenantId, {
      analytics: merged as Prisma.InputJsonValue,
    });
    await this.revalidate(tenantId);
    return (result.analytics ?? {}) as Record<string, unknown>;
  }
}

export default new SitesService();
