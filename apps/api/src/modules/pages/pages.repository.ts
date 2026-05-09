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
  // Phase 6 — surface review state in lists.
  reviewStatus: true,
  // Phase 8 — page-top customization.
  coverImageUrl: true,
  icon: true,
  seoTitle: true,
  seoDescription: true,
  // Phase 5 — scope page support.
  kind: true,
  scope: true,
  isBuiltInScope: true,
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

    // Scope pages are sorted by BLUEPRINT_SCOPES order; user pages by navOrder then title.
    const SCOPE_ORDER: Record<string, number> = {
      header: 0,
      footer: 1,
      home: 2,
      "products-index": 3,
      "product-detail": 4,
      offers: 5,
      cart: 6,
      "blog-index": 7,
      "blog-post": 8,
      contact: 9,
      page: 10,
      "404": 11,
    };

    return Promise.all([
      prisma.tenantPage.findMany({
        where,
        select: PAGE_LIST_SELECT,
        orderBy: [
          // Scope pages first (sorted by BLUEPRINT_SCOPES order)
          { kind: "asc" },
          // Within each kind, scope pages by scope order, user pages by nav order then title
        ],
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      prisma.tenantPage.count({ where }),
    ]).then(([pages, total]) => {
      // Sort with custom logic for scopes, then nav order for user pages
      const sorted = pages.sort((a, b) => {
        // Scopes first
        if (a.kind === "scope" && b.kind === "page") return -1;
        if (a.kind === "page" && b.kind === "scope") return 1;

        // Within scopes: sort by BLUEPRINT_SCOPES order
        if (a.kind === "scope" && b.kind === "scope") {
          const scopeAOrder = SCOPE_ORDER[a.scope ?? ""] ?? 999;
          const scopeBOrder = SCOPE_ORDER[b.scope ?? ""] ?? 999;
          return scopeAOrder - scopeBOrder;
        }

        // Within user pages: sort by navOrder then title
        if (a.navOrder !== b.navOrder) return a.navOrder - b.navOrder;
        return a.title.localeCompare(b.title);
      });

      return [sorted, total];
    });
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

  /**
   * Upsert a scope page (kind="scope") for a template's built-in scope.
   * Idempotent on the (tenantId, scope) unique constraint where kind='scope'.
   * Used when seeding layouts from a blueprint to create TenantPage rows
   * that appear in the Pages list alongside user-created custom pages.
   */
  async upsertScopePage(
    tenantId: string,
    scope: string,
    data: { title: string; slug: string },
  ): Promise<TenantPage> {
    // Try to find existing scope page
    const existing = await prisma.tenantPage.findFirst({
      where: { tenantId, kind: "scope", scope },
    });

    if (existing) {
      // Update title if it changed, leave other fields alone
      return prisma.tenantPage.update({
        where: { id: existing.id },
        data: { title: data.title },
      });
    }

    // Create new scope page
    return prisma.tenantPage.create({
      data: {
        tenantId,
        slug: data.slug,
        title: data.title,
        bodyMarkdown: "",
        body: [],
        kind: "scope",
        scope,
        isBuiltInScope: true,
        showInNav: true,
        navOrder: 0,
        isPublished: true,
      },
    });
  }

  /**
   * Upsert a custom page (kind="page") from a template's defaultPages entry.
   * Idempotent on the (tenantId, kind, slug) unique constraint.
   *
   * On first apply, creates a new TenantPage + SiteLayout with the page's blocks.
   * On re-apply: if `overwriteExisting=true`, updates the page and layout (used when
   * resetBranding=true). Otherwise, leaves existing user edits untouched.
   */
  async upsertCustomPage(
    tenantId: string,
    data: {
      slug: string;
      title: string;
      navOrder?: number;
      description?: string;
      seoTitle?: string;
      seoDescription?: string;
    },
    overwriteExisting: boolean = false,
  ): Promise<TenantPage> {
    // Try to find existing custom page
    const existing = await prisma.tenantPage.findFirst({
      where: { tenantId, kind: "page", slug: data.slug },
    });

    if (existing) {
      if (!overwriteExisting) {
        // Preserve existing user edits — return as-is
        return existing;
      }
      // Overwrite: update title and metadata
      return prisma.tenantPage.update({
        where: { id: existing.id },
        data: {
          title: data.title,
          ...(data.navOrder !== undefined && { navOrder: data.navOrder }),
          ...(data.seoTitle !== undefined && { seoTitle: data.seoTitle }),
          ...(data.seoDescription !== undefined && {
            seoDescription: data.seoDescription,
          }),
        },
      });
    }

    // Create new custom page
    return prisma.tenantPage.create({
      data: {
        tenantId,
        slug: data.slug,
        title: data.title,
        bodyMarkdown: "",
        body: [],
        kind: "page",
        scope: null,
        isBuiltInScope: false,
        showInNav: true,
        navOrder: data.navOrder ?? 0,
        isPublished: false, // Custom pages start as drafts
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
      },
    });
  }
}

export default new PagesRepository();
