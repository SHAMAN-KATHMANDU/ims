/**
 * Tenant-scoped pages repository.
 *
 * Uses the extended `prisma` client — auto-scoped by AsyncLocalStorage tenant
 * context. The service layer is the tenant boundary, so update/delete use
 * `{ where: { id } }` after a tenant-scoped read.
 */

import prisma from "@/config/prisma";
import type { Prisma, TenantPage } from "@prisma/client";

const PAGE_LIST_SELECT = {
  id: true,
  tenantId: true,
  slug: true,
  title: true,
  layoutVariant: true,
  showInNav: true,
  navOrder: true,
  isPublished: true,
  seoTitle: true,
  seoDescription: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TenantPageSelect;

export type TenantPageListItem = Prisma.TenantPageGetPayload<{
  select: typeof PAGE_LIST_SELECT;
}>;

export class PagesRepository {
  listPages(
    tenantId: string,
    opts: {
      page: number;
      limit: number;
      published?: boolean;
    },
  ): Promise<[TenantPageListItem[], number]> {
    const where: Prisma.TenantPageWhereInput = {
      tenantId,
      ...(opts.published === undefined ? {} : { isPublished: opts.published }),
    };

    return Promise.all([
      prisma.tenantPage.findMany({
        where,
        select: PAGE_LIST_SELECT,
        orderBy: [{ navOrder: "asc" }, { title: "asc" }],
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      prisma.tenantPage.count({ where }),
    ]);
  }

  getPageById(tenantId: string, id: string): Promise<TenantPage | null> {
    return prisma.tenantPage.findFirst({ where: { id, tenantId } });
  }

  findPageBySlug(tenantId: string, slug: string): Promise<TenantPage | null> {
    return prisma.tenantPage.findFirst({ where: { tenantId, slug } });
  }

  createPage(
    tenantId: string,
    data: Omit<Prisma.TenantPageCreateInput, "tenant">,
  ): Promise<TenantPage> {
    return prisma.tenantPage.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  updatePage(
    _tenantId: string,
    id: string,
    data: Prisma.TenantPageUpdateInput,
  ): Promise<TenantPage> {
    return prisma.tenantPage.update({ where: { id }, data });
  }

  deletePage(_tenantId: string, id: string): Promise<TenantPage> {
    return prisma.tenantPage.delete({ where: { id } });
  }

  /**
   * Look up the verified primary WEBSITE hostname for a tenant. Used when
   * minting preview URLs so the iframe points at the tenant's real domain.
   * Returns null if no verified primary website domain is set (dev tenants
   * typically fall back to TENANT_SITE_PUBLIC_URL).
   */
  findPrimaryWebsiteHostname(tenantId: string): Promise<string | null> {
    return prisma.tenantDomain
      .findFirst({
        where: {
          tenantId,
          appType: "WEBSITE",
          isPrimary: true,
          verifiedAt: { not: null },
        },
        select: { hostname: true },
      })
      .then((d) => d?.hostname ?? null);
  }

  /**
   * Bulk-update nav order. Wrapped in a transaction so a partial failure
   * leaves the nav in a consistent state.
   */
  reorderPages(
    _tenantId: string,
    updates: { id: string; navOrder: number }[],
  ): Promise<void> {
    return prisma.$transaction(async (tx) => {
      for (const u of updates) {
        await tx.tenantPage.update({
          where: { id: u.id },
          data: { navOrder: u.navOrder },
        });
      }
    });
  }
}

export default new PagesRepository();
