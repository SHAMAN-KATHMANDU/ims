/**
 * Tenant-scoped custom-pages service.
 *
 * Every mutation:
 *   1. Asserts the tenant's SiteConfig exists and `websiteEnabled = true`
 *      (custom pages are part of the website product)
 *   2. Writes to the DB
 *   3. Fires revalidation with the right tag set
 *
 * Slug uniqueness is enforced at the DB level; P2002 → 409. Publishing a page
 * is a simple boolean toggle — no draft/review workflow in Phase C.1.
 */

import { Prisma } from "@prisma/client";
import sitesRepo from "@/modules/sites/sites.repository";
import { env } from "@/config/env";
import { createError } from "@/middlewares/errorHandler";
import { signPreviewToken } from "@/modules/site-preview/preview-token";
import defaultRepo, { type TenantPageListItem } from "./pages.repository";
import type {
  CreateTenantPageInput,
  ListTenantPagesQuery,
  ReorderPagesInput,
  UpdateTenantPageInput,
} from "./pages.schema";
import {
  revalidatePages as defaultRevalidate,
  type RevalidatePageOpts,
} from "./pages.revalidate";

type Repo = typeof defaultRepo;
type SitesRepo = typeof sitesRepo;
type Revalidate = (
  tenantId: string,
  opts?: RevalidatePageOpts,
) => Promise<void>;

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

export class PagesService {
  constructor(
    private readonly repo: Repo = defaultRepo,
    private readonly sites: SitesRepo = sitesRepo,
    private readonly revalidate: Revalidate = defaultRevalidate,
  ) {}

  private async assertEnabled(tenantId: string): Promise<void> {
    const site = await this.sites.findConfig(tenantId);
    if (!site) {
      throw createError(
        "Website feature is not enabled for this tenant. Contact your platform administrator.",
        403,
      );
    }
    if (!site.websiteEnabled) {
      throw createError(
        "Website feature is disabled for this tenant. Contact your platform administrator.",
        403,
      );
    }
  }

  async listPages(
    tenantId: string,
    query: ListTenantPagesQuery,
  ): Promise<{
    pages: TenantPageListItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    await this.assertEnabled(tenantId);
    const [pages, total] = await this.repo.listPages(tenantId, {
      page: query.page,
      limit: query.limit,
      published: query.published,
    });
    return { pages, total, page: query.page, limit: query.limit };
  }

  async getPage(tenantId: string, id: string) {
    await this.assertEnabled(tenantId);
    const page = await this.repo.getPageById(tenantId, id);
    if (!page) throw createError("Page not found", 404);
    return page;
  }

  async createPage(tenantId: string, input: CreateTenantPageInput) {
    await this.assertEnabled(tenantId);

    const data: Omit<Prisma.TenantPageCreateInput, "tenant"> = {
      slug: input.slug,
      title: input.title,
      bodyMarkdown: input.bodyMarkdown,
      layoutVariant: input.layoutVariant,
      showInNav: input.showInNav,
      navOrder: input.navOrder,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
    };

    try {
      const page = await this.repo.createPage(tenantId, data);
      await this.revalidate(tenantId, { slug: page.slug });
      return page;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw createError("A page with this slug already exists", 409);
      }
      throw err;
    }
  }

  async updatePage(tenantId: string, id: string, input: UpdateTenantPageInput) {
    await this.assertEnabled(tenantId);
    const existing = await this.repo.getPageById(tenantId, id);
    if (!existing) throw createError("Page not found", 404);

    const data: Prisma.TenantPageUpdateInput = {};
    if (input.slug !== undefined) data.slug = input.slug;
    if (input.title !== undefined) data.title = input.title;
    if (input.bodyMarkdown !== undefined)
      data.bodyMarkdown = input.bodyMarkdown;
    if (input.layoutVariant !== undefined)
      data.layoutVariant = input.layoutVariant;
    if (input.showInNav !== undefined) data.showInNav = input.showInNav;
    if (input.navOrder !== undefined) data.navOrder = input.navOrder;
    if (input.seoTitle !== undefined) data.seoTitle = input.seoTitle ?? null;
    if (input.seoDescription !== undefined) {
      data.seoDescription = input.seoDescription ?? null;
    }

    try {
      const page = await this.repo.updatePage(tenantId, id, data);
      await this.revalidate(tenantId, { slug: page.slug });
      if (existing.slug !== page.slug) {
        await this.revalidate(tenantId, { slug: existing.slug });
      }
      return page;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw createError("A page with this slug already exists", 409);
      }
      throw err;
    }
  }

  async publishPage(tenantId: string, id: string) {
    await this.assertEnabled(tenantId);
    const existing = await this.repo.getPageById(tenantId, id);
    if (!existing) throw createError("Page not found", 404);
    const page = await this.repo.updatePage(tenantId, id, {
      isPublished: true,
    });
    await this.revalidate(tenantId, { slug: page.slug });
    return page;
  }

  async unpublishPage(tenantId: string, id: string) {
    await this.assertEnabled(tenantId);
    const existing = await this.repo.getPageById(tenantId, id);
    if (!existing) throw createError("Page not found", 404);
    const page = await this.repo.updatePage(tenantId, id, {
      isPublished: false,
    });
    await this.revalidate(tenantId, { slug: page.slug });
    return page;
  }

  async deletePage(tenantId: string, id: string): Promise<void> {
    await this.assertEnabled(tenantId);
    const existing = await this.repo.getPageById(tenantId, id);
    if (!existing) throw createError("Page not found", 404);
    await this.repo.deletePage(tenantId, id);
    await this.revalidate(tenantId, { slug: existing.slug });
  }

  /**
   * Mint a short-lived preview URL the admin can drop into an iframe. The
   * URL points at the tenant-site /preview/page/:id route with an HMAC
   * token bound to (tenantId, pageId). In prod the URL uses the tenant's
   * verified primary WEBSITE domain; in dev it falls back to
   * TENANT_SITE_PUBLIC_URL.
   */
  async mintPreviewUrl(tenantId: string, id: string): Promise<{ url: string }> {
    await this.assertEnabled(tenantId);
    const page = await this.repo.getPageById(tenantId, id);
    if (!page) throw createError("Page not found", 404);

    const hostname = await this.repo.findPrimaryWebsiteHostname(tenantId);
    const baseUrl = hostname ? `https://${hostname}` : env.tenantSitePublicUrl;
    if (!baseUrl) {
      throw createError(
        "No preview target available: this tenant has no verified primary website domain and TENANT_SITE_PUBLIC_URL is not configured.",
        503,
      );
    }

    const token = signPreviewToken({ tenantId, pageId: id });
    return {
      url: `${baseUrl.replace(/\/+$/, "")}/preview/page/${id}?token=${encodeURIComponent(
        token,
      )}`,
    };
  }

  async reorder(tenantId: string, input: ReorderPagesInput): Promise<void> {
    await this.assertEnabled(tenantId);
    if (input.order.length === 0) return;

    // Zod guarantees both fields are present at parse time, but the
    // inferred type under exactOptionalPropertyTypes leaves them as
    // optional. Narrow to the shape the repo expects.
    const updates = input.order.map((o) => ({
      id: o.id,
      navOrder: o.navOrder,
    }));

    // Verify every id belongs to this tenant before running the bulk update.
    const ids = updates.map((u) => u.id);
    const found = await Promise.all(
      ids.map((id) => this.repo.getPageById(tenantId, id)),
    );
    const missing = found.findIndex((p) => !p);
    if (missing !== -1) {
      throw createError(
        `Page ${ids[missing]} does not belong to this tenant`,
        404,
      );
    }

    await this.repo.reorderPages(tenantId, updates);
    await this.revalidate(tenantId);
  }
}

export default new PagesService();
