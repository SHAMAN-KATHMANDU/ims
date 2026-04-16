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
import siteLayoutsRepo from "@/modules/site-layouts/site-layouts.repository";
import { revalidateSiteLayout } from "@/modules/site-layouts/site-layouts.revalidate";
import type { BlockNode } from "@repo/shared";
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

  /**
   * Convert a markdown-bodied TenantPage into a block-based layout.
   *
   * Modes:
   *   - "convert" (default) — wrap the existing markdown body in a single
   *     `markdown-body` block at the top of a new SiteLayout. Tenant keeps
   *     all their content and can replace it with native blocks at their
   *     own pace. Idempotent: no-op if a SiteLayout row already exists.
   *   - "fresh" — create an empty SiteLayout row. The markdown body stays
   *     on the TenantPage row but is no longer rendered (since the
   *     SiteLayout takes precedence in apps/tenant-site/app/[slug]/page.tsx).
   *     Effectively a "start from scratch" mode.
   *
   * Returns 409 if a layout row already exists for this page (caller should
   * navigate to the editor instead of recreating).
   */
  async convertToBlocks(
    tenantId: string,
    pageId: string,
    mode: "convert" | "fresh",
  ): Promise<{ layoutId: string; blocks: BlockNode[] }> {
    await this.assertEnabled(tenantId);
    const page = await this.repo.getPageById(tenantId, pageId);
    if (!page) throw createError("Page not found", 404);

    const existing = await siteLayoutsRepo.findByKey(tenantId, {
      scope: "page",
      pageId,
    });
    if (existing) {
      throw createError(
        "Block layout already exists for this page — open it in the editor",
        409,
      );
    }

    const blocks: BlockNode[] =
      mode === "convert" && page.bodyMarkdown.trim().length > 0
        ? [
            {
              id: `mb-${pageId.slice(0, 8)}`,
              kind: "markdown-body",
              props: {
                source: page.bodyMarkdown,
                maxWidth: "default",
              },
            },
          ]
        : [];

    const row = await siteLayoutsRepo.upsertDraft(
      tenantId,
      { scope: "page", pageId },
      blocks as unknown as Prisma.InputJsonValue,
    );
    // Publish immediately so the live page picks up the new render path
    // without forcing a separate Publish click in the editor.
    await siteLayoutsRepo.publishDraft(tenantId, { scope: "page", pageId });
    await revalidateSiteLayout(tenantId, "page");

    return { layoutId: row.id, blocks };
  }

  /**
   * Duplicate a TenantPage. Clones the row with a unique slug
   * (`${slug}-copy`, then `-copy-2`, etc. on collision) and copies any
   * associated SiteLayout{scope:"page",pageId} row so block-edited pages
   * keep their layout.
   */
  async duplicatePage(tenantId: string, id: string) {
    await this.assertEnabled(tenantId);
    const original = await this.repo.getPageById(tenantId, id);
    if (!original) throw createError("Page not found", 404);

    // Find a unique slug. Cap attempts so a malicious slug-collision flood
    // can't loop forever — 50 is plenty of headroom for normal use.
    let slug = `${original.slug}-copy`;
    for (let i = 0; i < 50; i++) {
      const collision = await this.repo.findPageBySlug(tenantId, slug);
      if (!collision) break;
      slug = `${original.slug}-copy-${i + 2}`;
    }

    const copy = await this.repo.createPage(tenantId, {
      slug,
      title: `${original.title} (copy)`,
      bodyMarkdown: original.bodyMarkdown,
      layoutVariant: original.layoutVariant,
      showInNav: false, // duplicate hidden by default to avoid surprise nav entries
      navOrder: original.navOrder,
      seoTitle: original.seoTitle ?? null,
      seoDescription: original.seoDescription ?? null,
    });

    // Copy associated block layout if present.
    const sourceLayout = await siteLayoutsRepo.findByKey(tenantId, {
      scope: "page",
      pageId: id,
    });
    if (sourceLayout) {
      const blocks = sourceLayout.blocks as Prisma.InputJsonValue;
      await siteLayoutsRepo.upsertDraft(
        tenantId,
        { scope: "page", pageId: copy.id },
        blocks,
      );
      await siteLayoutsRepo.publishDraft(tenantId, {
        scope: "page",
        pageId: copy.id,
      });
    }

    await this.revalidate(tenantId, { slug: copy.slug });
    return copy;
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
