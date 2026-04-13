/**
 * Platform-websites repository. Cross-tenant reads/writes use basePrisma.
 */

import { basePrisma } from "@/config/prisma";
import type { Prisma, SiteConfig, SiteTemplate } from "@prisma/client";

type SiteTemplateList = SiteTemplate[];

class PlatformWebsitesRepository {
  tenantExists(tenantId: string): Promise<{ id: string } | null> {
    return basePrisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });
  }

  findSiteConfigByTenant(
    tenantId: string,
  ): Promise<(SiteConfig & { template: SiteTemplate | null }) | null> {
    return basePrisma.siteConfig.findUnique({
      where: { tenantId },
      include: { template: true },
    });
  }

  findTemplateBySlug(slug: string): Promise<SiteTemplate | null> {
    return basePrisma.siteTemplate.findUnique({ where: { slug } });
  }

  listAllTemplates(): Promise<SiteTemplateList> {
    return basePrisma.siteTemplate.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  createSiteConfig(
    data: Prisma.SiteConfigUncheckedCreateInput,
  ): Promise<SiteConfig> {
    return basePrisma.siteConfig.create({ data });
  }

  updateSiteConfig(
    tenantId: string,
    data: Prisma.SiteConfigUpdateInput,
  ): Promise<SiteConfig> {
    return basePrisma.siteConfig.update({ where: { tenantId }, data });
  }

  /**
   * Upsert is used so the "enable" flow is a single atomic call whether or
   * not the tenant already has a SiteConfig row.
   */
  upsertSiteConfig(
    tenantId: string,
    create: Prisma.SiteConfigUncheckedCreateInput,
    update: Prisma.SiteConfigUpdateInput,
  ): Promise<SiteConfig> {
    return basePrisma.siteConfig.upsert({
      where: { tenantId },
      create,
      update,
    });
  }
}

export default new PlatformWebsitesRepository();
