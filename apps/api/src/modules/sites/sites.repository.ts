/**
 * Tenant-scoped site repository.
 *
 * Uses the extended `prisma` client which is auto-scoped by AsyncLocalStorage
 * tenantContext. All reads/writes here run inside a tenant's session and the
 * explicit `tenantId` passed in is used as a belt-and-suspenders filter.
 */

import prisma from "@/config/prisma";
import type { Prisma, SiteConfig, SiteTemplate } from "@prisma/client";

export type SiteConfigWithTemplate = SiteConfig & {
  template: SiteTemplate | null;
};

export class SitesRepository {
  findConfig(tenantId: string): Promise<SiteConfigWithTemplate | null> {
    return prisma.siteConfig.findUnique({
      where: { tenantId },
      include: { template: true },
    });
  }

  updateConfig(
    tenantId: string,
    data: Prisma.SiteConfigUpdateInput,
  ): Promise<SiteConfigWithTemplate> {
    return prisma.siteConfig.update({
      where: { tenantId },
      data,
      include: { template: true },
    });
  }

  listActiveTemplates(): Promise<SiteTemplate[]> {
    return prisma.siteTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  findTemplateBySlug(slug: string): Promise<SiteTemplate | null> {
    return prisma.siteTemplate.findUnique({ where: { slug } });
  }
}

export default new SitesRepository();
