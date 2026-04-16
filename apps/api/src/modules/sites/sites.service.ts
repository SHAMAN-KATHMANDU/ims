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
import type { UpdateSiteConfigInput, PickTemplateInput } from "./sites.schema";
import { revalidateTenantSite as defaultRevalidate } from "./sites.revalidate";
import siteLayoutsRepo from "@/modules/site-layouts/site-layouts.repository";
import { revalidateSiteLayout } from "@/modules/site-layouts/site-layouts.revalidate";
import {
  getTemplateBlueprint,
  BLUEPRINT_SCOPES,
  type TemplateBlueprint,
} from "./blueprints";

type Repo = typeof defaultRepo;
type Revalidate = (tenantId: string) => Promise<void>;

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
      data.branding =
        template.defaultBranding === null
          ? Prisma.JsonNull
          : (template.defaultBranding as Prisma.InputJsonValue);
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

    const result = await this.repo.updateConfig(tenantId, {
      isPublished: true,
    });
    await this.revalidate(tenantId);
    return result;
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
}

export default new SitesService();
