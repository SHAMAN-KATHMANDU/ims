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
 *
 * Issue #429: additionally checks the token's nonce against the Redis
 * allowlist so revoked tokens (editor closed, user signed out) are rejected
 * even if the HMAC is valid and the token hasn't expired yet.
 */

import { createError } from "@/middlewares/errorHandler";
import { verifySitePreviewToken } from "@/modules/site-preview/preview-token";
import { checkPreviewNonce } from "@/modules/site-preview/preview-nonce";
import sitesRepo from "@/modules/sites/sites.repository";
import publicSiteRepo from "@/modules/public-site/public-site.repository";
import publicPagesRepo from "@/modules/public-pages/public-pages.repository";
import publicBlogRepo from "@/modules/public-blog/public-blog.repository";
import siteLayoutsRepo from "@/modules/site-layouts/site-layouts.repository";
import navMenusRepo from "@/modules/nav-menus/nav-menus.repository";
import businessProfileRepo from "@/modules/business-profile/business-profile.repository";

/**
 * Publicly-safe business profile DTO surfaced to the editor preview iframe.
 * Tax / regulatory fields (PAN, VAT, taxId, registrationNumber) are stripped
 * since the preview is rendered with the same projection as the public site.
 */
export interface PublicBusinessProfile {
  id: string;
  tenantId: string;
  legalName: string | null;
  displayName: string | null;
  tagline: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
  websiteUrl: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  mapUrl: string | null;
  defaultCurrency: string;
  timezone: string | null;
  socials: unknown;
}

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
    businessProfile: PublicBusinessProfile | null;
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

const REVOKED_MSG =
  "Preview link expired or revoked. Generate a new preview from the editor.";

export class PublicSitePreviewService {
  async getPreview(
    token: string,
    scope: string,
    opts: { productId?: string },
  ): Promise<SitePreviewResponse> {
    // 1. HMAC + expiry check (pure, synchronous)
    const payload = verifySitePreviewToken(token);
    if (!payload) throw createError(REVOKED_MSG, 401);

    // 2. Scope binding check
    if (payload.scope !== scope) {
      throw createError("Token scope does not match request", 401);
    }

    // 3. Redis nonce check — token must still be in the allowlist.
    //    Covers revoked tokens (editor closed / user signed out) and old tokens
    //    that have been superseded by a refresh.
    const nonceValid = await checkPreviewNonce(payload.tenantId, payload.nonce);
    if (!nonceValid) throw createError(REVOKED_MSG, 401);

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
      businessProfile,
    ] = await Promise.all([
      navMenusRepo.findBySlot(tenantId, "header-primary"),
      navMenusRepo.findBySlot(tenantId, "footer-1"),
      navMenusRepo.findBySlot(tenantId, "footer-2"),
      publicSiteRepo.listCategories(tenantId),
      publicSiteRepo.listProducts(tenantId, { page: 1, limit: 24 }),
      publicPagesRepo.listPages(tenantId, { navOnly: true }),
      publicBlogRepo.listFeatured(tenantId, 3).catch(() => []),
      businessProfileRepo.getByTenant(tenantId).catch(() => null),
    ]);

    const [products] = productsResult;

    // Strip tax / regulatory fields before exposing to the iframe — same
    // projection used for the public storefront.
    let publicProfile: PublicBusinessProfile | null = null;
    if (businessProfile) {
      const {
        panNumber: _pan,
        vatNumber: _vat,
        taxId: _taxId,
        registrationNumber: _reg,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        ...safe
      } = businessProfile;
      publicProfile = safe;
    }

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
        businessProfile: publicProfile,
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
