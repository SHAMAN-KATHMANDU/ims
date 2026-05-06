/**
 * Snippets repository — only file in the module that imports prisma.
 */

import prisma from "@/config/prisma";
import type { Prisma, SiteSnippet } from "@prisma/client";

export interface ListSnippetsParams {
  tenantId: string;
  page: number;
  limit: number;
  category?: string;
  search?: string;
}

export type SnippetRow = SiteSnippet;

const LIST_SELECT = {
  id: true,
  slug: true,
  title: true,
  category: true,
  updatedAt: true,
  createdAt: true,
} satisfies Prisma.SiteSnippetSelect;

export type SnippetListItem = Prisma.SiteSnippetGetPayload<{
  select: typeof LIST_SELECT;
}>;

export class SnippetsRepository {
  async list(params: ListSnippetsParams): Promise<{
    rows: SnippetListItem[];
    total: number;
  }> {
    const where: Prisma.SiteSnippetWhereInput = {
      tenantId: params.tenantId,
      ...(params.category ? { category: params.category } : {}),
      ...(params.search
        ? {
            OR: [
              { title: { contains: params.search, mode: "insensitive" } },
              { slug: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.siteSnippet.findMany({
        where,
        select: LIST_SELECT,
        orderBy: { updatedAt: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.siteSnippet.count({ where }),
    ]);
    return { rows, total };
  }

  getById(tenantId: string, id: string): Promise<SnippetRow | null> {
    return prisma.siteSnippet.findFirst({ where: { id, tenantId } });
  }

  getBySlug(tenantId: string, slug: string): Promise<SnippetRow | null> {
    return prisma.siteSnippet.findFirst({ where: { slug, tenantId } });
  }

  create(
    tenantId: string,
    data: Omit<Prisma.SiteSnippetCreateInput, "tenant">,
  ): Promise<SnippetRow> {
    return prisma.siteSnippet.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  update(
    _tenantId: string,
    id: string,
    data: Prisma.SiteSnippetUpdateInput,
  ): Promise<SnippetRow> {
    return prisma.siteSnippet.update({ where: { id }, data });
  }

  delete(_tenantId: string, id: string): Promise<SnippetRow> {
    return prisma.siteSnippet.delete({ where: { id } });
  }
}

export default new SnippetsRepository();
