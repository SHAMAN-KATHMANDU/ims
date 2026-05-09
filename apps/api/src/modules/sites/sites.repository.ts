/**
 * Tenant-scoped site repository.
 *
 * Uses the extended `prisma` client which is auto-scoped by AsyncLocalStorage
 * tenantContext. All reads/writes here run inside a tenant's session and the
 * explicit `tenantId` passed in is used as a belt-and-suspenders filter.
 */

import prisma from "@/config/prisma";
import { Prisma, type SiteConfig, type SiteTemplate } from "@prisma/client";
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

  async upsertConfig(
    tenantId: string,
    data: Record<string, unknown>,
  ): Promise<SiteConfigWithTemplate> {
    // Writes invalidate the per-request memo.
    const memo = getRequestMemo();
    if (memo) memo.delete(`${SITE_CONFIG_MEMO_PREFIX}${tenantId}`);
    return (await prisma.siteConfig.upsert({
      where: { tenantId },
      create: { ...data, tenantId } as unknown as Prisma.SiteConfigCreateInput,
      update: data as unknown as Prisma.SiteConfigUpdateInput,
      include: { template: true },
    })) as SiteConfigWithTemplate;
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

  /**
   * Find a tenant's fork of a canonical template.
   */
  findTenantForkOfTemplate(
    tenantId: string,
    parentTemplateId: string,
  ): Promise<SiteTemplate | null> {
    return prisma.siteTemplate.findFirst({
      where: {
        parentTemplateId,
        ownerTenantId: tenantId,
      },
    });
  }

  /**
   * Atomically promote all draft SiteLayouts → published blocks and flip
   * SiteConfig.isPublished in a single transaction. Implements idempotency:
   * if no drafts exist and config is already published, returns early.
   *
   * Returns the updated SiteConfig and count of promoted layouts.
   * Throws if transaction fails.
   */
  async publishAllDrafts(tenantId: string): Promise<{
    siteConfig: SiteConfigWithTemplate;
    promoted: number;
    wasNoOp: boolean;
  }> {
    // Check current state for idempotency
    const current = await this.findConfig(tenantId);
    if (!current) {
      throw new Error("SiteConfig not found");
    }

    // Find layouts with drafts
    const drafts = await prisma.siteLayout.findMany({
      where: {
        tenantId,
        draftBlocks: { not: Prisma.JsonNull },
      },
      select: { id: true },
    });

    // Idempotency: if no drafts and already published, no-op
    if (drafts.length === 0 && current.isPublished) {
      return {
        siteConfig: current,
        promoted: 0,
        wasNoOp: true,
      };
    }

    // Atomically promote all drafts and flip config in one transaction
    const memo = getRequestMemo();
    if (memo) memo.delete(`${SITE_CONFIG_MEMO_PREFIX}${tenantId}`);

    const result = await prisma.$transaction(async (tx) => {
      // Promote each draft layout
      for (const layout of drafts) {
        const existing = await tx.siteLayout.findUnique({
          where: { id: layout.id },
        });
        if (existing?.draftBlocks) {
          await tx.siteLayout.update({
            where: { id: layout.id },
            data: {
              blocks: existing.draftBlocks as Prisma.InputJsonValue,
              draftBlocks: null,
              version: { increment: 1 },
            },
          });
        }
      }

      // Flip config
      const updatedConfig = await tx.siteConfig.update({
        where: { tenantId },
        data: { isPublished: true },
        include: { template: true },
      });

      return updatedConfig;
    });

    return {
      siteConfig: result as SiteConfigWithTemplate,
      promoted: drafts.length,
      wasNoOp: false,
    };
  }
}

export default new SitesRepository();
