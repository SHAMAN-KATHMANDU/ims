/**
 * Platform-websites service — enable/disable the website feature for a tenant
 * and optionally pre-pick a template. Disabling keeps the SiteConfig so that
 * re-enabling preserves tenant content.
 */

import type { Prisma, SiteConfig, SiteTemplate } from "@prisma/client";
import { createError } from "@/middlewares/errorHandler";
import defaultRepo from "./platform-websites.repository";
import type { EnableWebsiteInput } from "./platform-websites.schema";

type Repo = typeof defaultRepo;

export type SiteConfigWithTemplate = SiteConfig & {
  template: SiteTemplate | null;
};

export class PlatformWebsitesService {
  constructor(private readonly repo: Repo = defaultRepo) {}

  async getSiteConfig(tenantId: string): Promise<SiteConfigWithTemplate> {
    const tenant = await this.repo.tenantExists(tenantId);
    if (!tenant) throw createError("Tenant not found", 404);
    const config = await this.repo.findSiteConfigByTenant(tenantId);
    if (!config) throw createError("Site config not found", 404);
    return config;
  }

  async enableWebsite(
    tenantId: string,
    input: EnableWebsiteInput,
  ): Promise<SiteConfigWithTemplate> {
    const tenant = await this.repo.tenantExists(tenantId);
    if (!tenant) throw createError("Tenant not found", 404);

    let template: SiteTemplate | null = null;
    if (input.templateSlug) {
      template = await this.repo.findTemplateBySlug(input.templateSlug);
      if (!template) throw createError("Template not found", 404);
      if (!template.isActive) {
        throw createError("Template is not active", 400);
      }
    }

    const createData: Prisma.SiteConfigUncheckedCreateInput = {
      tenantId,
      websiteEnabled: true,
      templateId: template?.id ?? null,
      branding: template?.defaultBranding ?? undefined,
      features: template?.defaultSections ?? undefined,
    };

    // On update, preserve customizations. Only re-apply template defaults if
    // the caller is explicitly picking a (potentially new) template.
    const updateData: Prisma.SiteConfigUpdateInput = template
      ? {
          websiteEnabled: true,
          template: { connect: { id: template.id } },
          branding: template.defaultBranding ?? undefined,
          features: template.defaultSections ?? undefined,
        }
      : { websiteEnabled: true };

    await this.repo.upsertSiteConfig(tenantId, createData, updateData);

    const refreshed = await this.repo.findSiteConfigByTenant(tenantId);
    if (!refreshed) {
      throw createError("Failed to load site config after upsert", 500);
    }
    return refreshed;
  }

  async listTemplates(): Promise<SiteTemplate[]> {
    return this.repo.listAllTemplates();
  }

  async disableWebsite(tenantId: string): Promise<SiteConfigWithTemplate> {
    const tenant = await this.repo.tenantExists(tenantId);
    if (!tenant) throw createError("Tenant not found", 404);

    const existing = await this.repo.findSiteConfigByTenant(tenantId);
    if (!existing) {
      throw createError("Website feature is not enabled for this tenant", 404);
    }

    await this.repo.updateSiteConfig(tenantId, {
      websiteEnabled: false,
      // Force-unpublish on disable so no public traffic leaks through.
      isPublished: false,
    });

    const refreshed = await this.repo.findSiteConfigByTenant(tenantId);
    if (!refreshed) {
      throw createError("Failed to load site config after disable", 500);
    }
    return refreshed;
  }

  /**
   * Public helper used by other modules (e.g. platform-domains) to guard
   * creation of WEBSITE-typed domains behind the website feature flag.
   */
  async assertWebsiteEnabled(tenantId: string): Promise<void> {
    const config = await this.repo.findSiteConfigByTenant(tenantId);
    if (!config || !config.websiteEnabled) {
      throw createError(
        "Website feature is not enabled for this tenant. Enable it first via POST /platform/tenants/:tenantId/website/enable.",
        409,
      );
    }
  }
}

export default new PlatformWebsitesService();
