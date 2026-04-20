/**
 * Tenant-scoped site repository.
 *
 * Uses the extended `prisma` client which is auto-scoped by AsyncLocalStorage
 * tenantContext. All reads/writes here run inside a tenant's session and the
 * explicit `tenantId` passed in is used as a belt-and-suspenders filter.
 */

import prisma from "@/config/prisma";
import type { Prisma, SiteConfig, SiteTemplate } from "@prisma/client";
import { getRequestMemo } from "@/config/tenantContext";

export type SiteConfigWithTemplate = SiteConfig & {
  template: SiteTemplate | null;
};

const SITE_CONFIG_MEMO_PREFIX = "siteConfig:";

export class SitesRepository {
  /**
   * Fetch the tenant's SiteConfig + template.
   *
   * Memoized on the per-request tenant context (see runWithTenant /
   * getRequestMemo). Every /public/* handler calls this to assert
   * `websiteEnabled && isPublished`, and a cold homepage SSR used to
   * fire 5-7 identical reads — the memo collapses them to one. Outside
   * a tenant context (scripts, tests that bypass `runWithTenant`) the
   * call falls through to Prisma uncached, so behavior is unchanged.
   *
   * The memoized value is a Promise — callers that race on the same
   * tenant get the same in-flight query instead of duplicates.
   */
  findConfig(tenantId: string): Promise<SiteConfigWithTemplate | null> {
    const memo = getRequestMemo();
    const key = `${SITE_CONFIG_MEMO_PREFIX}${tenantId}`;
    if (memo) {
      const existing = memo.get(key) as
        | Promise<SiteConfigWithTemplate | null>
        | undefined;
      if (existing) return existing;
    }
    const fresh = prisma.siteConfig.findUnique({
      where: { tenantId },
      include: { template: true },
    });
    if (memo) memo.set(key, fresh);
    return fresh;
  }

  updateConfig(
    tenantId: string,
    data: Prisma.SiteConfigUpdateInput,
  ): Promise<SiteConfigWithTemplate> {
    // Writes invalidate the per-request memo so subsequent reads within
    // the same request see the update.
    const memo = getRequestMemo();
    if (memo) memo.delete(`${SITE_CONFIG_MEMO_PREFIX}${tenantId}`);
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
