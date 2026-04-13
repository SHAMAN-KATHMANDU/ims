/**
 * Public site repository — read-only queries for content served to unauth'd
 * website visitors. Uses tenant-scoped `prisma`; the resolveTenantFromHostname
 * middleware sets up the AsyncLocalStorage tenant context before handlers run,
 * so queries are auto-scoped. An explicit `tenantId` is also passed as a
 * belt-and-suspenders filter.
 */

import prisma from "@/config/prisma";
import type { Prisma, SiteConfig, SiteTemplate } from "@prisma/client";

export type PublicSiteConfig = SiteConfig & { template: SiteTemplate | null };

export class PublicSiteRepository {
  findSiteConfig(tenantId: string): Promise<PublicSiteConfig | null> {
    return prisma.siteConfig.findUnique({
      where: { tenantId },
      include: { template: true },
    });
  }

  listProducts(
    tenantId: string,
    opts: {
      page: number;
      limit: number;
      categoryId?: string;
      search?: string;
    },
  ) {
    const where: Prisma.ProductWhereInput = {
      tenantId,
      deletedAt: null,
      ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
      ...(opts.search
        ? { name: { contains: opts.search, mode: "insensitive" } }
        : {}),
    };

    return Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [{ dateCreated: "desc" }],
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
        select: {
          id: true,
          name: true,
          description: true,
          imsCode: true,
          mrp: true,
          finalSp: true,
          categoryId: true,
          subCategory: true,
          dateCreated: true,
          category: { select: { id: true, name: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);
  }

  findProduct(tenantId: string, id: string) {
    return prisma.product.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        description: true,
        imsCode: true,
        mrp: true,
        finalSp: true,
        length: true,
        breadth: true,
        height: true,
        weight: true,
        categoryId: true,
        subCategory: true,
        dateCreated: true,
        category: { select: { id: true, name: true } },
      },
    });
  }

  listCategories(tenantId: string) {
    return prisma.category.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true },
    });
  }
}

export default new PublicSiteRepository();
