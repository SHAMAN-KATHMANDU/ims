/**
 * public-site-preview service — token-gated draft preview of block-based
 * SiteLayouts for the Framer-lite editor iframe.
 *
 * Given a valid site-scope token + a scope path param, returns everything
 * a BlockRenderer needs for that scope: the draft layout itself, the site
 * config, categories, a products slice, nav pages, featured blog posts,
 * and (for product-detail scope) an active product + related products.
 *
 * Security: no hostname resolution. The token IS the auth. Expired /
 * malformed tokens => 401. Unknown scopes => 400. If no draft exists we
 * fall back to the published `blocks`, so an editor opened before any
 * save still shows the current site state.
 */

import { createError } from "@/middlewares/errorHandler";
import { verifySitePreviewToken } from "@/modules/site-preview/preview-token";
import sitesRepo from "@/modules/sites/sites.repository";
import publicSiteRepo from "@/modules/public-site/public-site.repository";
import publicPagesRepo from "@/modules/public-pages/public-pages.repository";
import publicBlogRepo from "@/modules/public-blog/public-blog.repository";
import siteLayoutsRepo from "@/modules/site-layouts/site-layouts.repository";
import navMenusRepo from "@/modules/nav-menus/nav-menus.repository";

export interface SitePreviewResponse {
  scope: string;
  pageId: string | null;
  draftLayout: {
    blocks: unknown;
    version: number;
    updatedAt: string;
  } | null;
  site: {
    branding: unknown;
    contact: unknown;
    features: unknown;
    seo: unknown;
    template: unknown;
  };
  navMenus: {
    headerPrimary: unknown | null;
    footer1: unknown | null;
    footer2: unknown | null;
  };
  categories: unknown[];
  products: unknown[];
  navPages: unknown[];
  featuredBlogPosts: unknown[];
  activeProduct: unknown | null;
  relatedProducts: unknown[];
}

export class PublicSitePreviewService {
  async getPreview(
    token: string,
    scope: string,
    opts: { productId?: string },
  ): Promise<SitePreviewResponse> {
    const payload = verifySitePreviewToken(token);
    if (!payload) throw createError("Invalid or expired preview token", 401);

    if (payload.scope !== scope) {
      throw createError("Token scope does not match request", 401);
    }

    const tenantId = payload.tenantId;

    // Site config — no ensurePublished check because previews need to work
    // on drafts (the whole point of a preview is to see unpublished state).
    const config = await sitesRepo.findConfig(tenantId);
    if (!config || !config.websiteEnabled) {
      throw createError("Site not found", 404);
    }

    // Draft layout for the requested scope. If none, fall back to
    // published; if neither, return null so the renderer shows empty state.
    const layoutRow = await siteLayoutsRepo.findByKey(tenantId, {
      scope,
      pageId: payload.pageId ?? null,
    });
    const draftLayout = layoutRow
      ? {
          blocks: layoutRow.draftBlocks ?? layoutRow.blocks,
          version: layoutRow.version,
          updatedAt: layoutRow.updatedAt.toISOString(),
        }
      : null;

    // Common data — everything a block tree might need in a preview render.
    const [
      headerNav,
      footer1,
      footer2,
      categories,
      productsResult,
      navPages,
      featured,
    ] = await Promise.all([
      navMenusRepo.findBySlot(tenantId, "header-primary"),
      navMenusRepo.findBySlot(tenantId, "footer-1"),
      navMenusRepo.findBySlot(tenantId, "footer-2"),
      publicSiteRepo.listCategories(tenantId),
      publicSiteRepo.listProducts(tenantId, { page: 1, limit: 24 }),
      publicPagesRepo.listPages(tenantId, { navOnly: true }),
      publicBlogRepo.listFeatured(tenantId, 3).catch(() => []),
    ]);

    const [products] = productsResult;

    // PDP scope: fetch the active product (from query param) + related
    // products from the same category.
    let activeProduct: unknown = null;
    let relatedProducts: unknown[] = [];
    if (scope === "product-detail" && opts.productId) {
      const product = await publicSiteRepo.findProduct(
        tenantId,
        opts.productId,
      );
      if (product) {
        activeProduct = product;
        if (product.category) {
          const [related] = await publicSiteRepo.listProducts(tenantId, {
            page: 1,
            limit: 8,
            categoryId: product.category.id,
          });
          relatedProducts = related.filter((p) => p.id !== product.id);
        }
      }
    }

    return {
      scope,
      pageId: payload.pageId ?? null,
      draftLayout,
      site: {
        branding: config.branding,
        contact: config.contact,
        features: config.features,
        seo: config.seo,
        template: null,
      },
      navMenus: {
        headerPrimary: headerNav?.items ?? null,
        footer1: footer1?.items ?? null,
        footer2: footer2?.items ?? null,
      },
      categories,
      products,
      navPages,
      featuredBlogPosts: featured,
      activeProduct,
      relatedProducts,
    };
  }
}

export default new PublicSitePreviewService();
