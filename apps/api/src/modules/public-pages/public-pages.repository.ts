/**
 * Public pages repository — read-only, only returns PUBLISHED pages.
 */

import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

const PUBLIC_PAGE_SELECT = {
  id: true,
  slug: true,
  title: true,
  bodyMarkdown: true,
  layoutVariant: true,
  // Phase 8 — page-top customization.
  coverImageUrl: true,
  icon: true,
  seoTitle: true,
  seoDescription: true,
  updatedAt: true,
} satisfies Prisma.TenantPageSelect;

const NAV_ITEM_SELECT = {
  id: true,
  slug: true,
  title: true,
  navOrder: true,
} satisfies Prisma.TenantPageSelect;

export type PublicTenantPage = Prisma.TenantPageGetPayload<{
  select: typeof PUBLIC_PAGE_SELECT;
}>;

export type PublicNavItem = Prisma.TenantPageGetPayload<{
  select: typeof NAV_ITEM_SELECT;
}>;

export class PublicPagesRepository {
  findPageBySlug(
    tenantId: string,
    slug: string,
  ): Promise<PublicTenantPage | null> {
    return prisma.tenantPage.findFirst({
      where: { tenantId, slug, isPublished: true },
      select: PUBLIC_PAGE_SELECT,
    });
  }

  /**
   * List PUBLISHED pages for a tenant. `navOnly=true` filters to pages
   * marked `showInNav`, ordered by navOrder — used by the header renderer.
   */
  listPages(
    tenantId: string,
    opts: { navOnly?: boolean } = {},
  ): Promise<PublicNavItem[]> {
    return prisma.tenantPage.findMany({
      where: {
        tenantId,
        isPublished: true,
        ...(opts.navOnly ? { showInNav: true } : {}),
      },
      select: NAV_ITEM_SELECT,
      orderBy: [{ navOrder: "asc" }, { title: "asc" }],
    });
  }
}

export default new PublicPagesRepository();
