/**
 * Public site service — serves read-only tenant content over unauthenticated
 * endpoints. All methods first assert that the tenant has a SiteConfig with
 * `websiteEnabled=true` AND `isPublished=true`; otherwise they return 404 so
 * the existence of the tenant isn't leaked to the public internet.
 */

import { createError } from "@/middlewares/errorHandler";
import defaultRepo, { type PublicSiteConfig } from "./public-site.repository";
import type {
  ListProductsQuery,
  ListReviewsPublicQuery,
  SubmitReviewInput,
} from "./public-site.schema";
import defaultCollectionsRepo from "@/modules/collections/collections.repository";
import defaultPromoRepo from "@/modules/promos/promo.repository";
import defaultBundleRepo from "@/modules/bundles/bundle.repository";

type Repo = typeof defaultRepo;
type CollectionsRepo = typeof defaultCollectionsRepo;
type PromoRepo = typeof defaultPromoRepo;
type BundleRepo = typeof defaultBundleRepo;

export class PublicSiteService {
  constructor(
    private readonly repo: Repo = defaultRepo,
    private readonly collectionsRepo: CollectionsRepo = defaultCollectionsRepo,
    private readonly promoRepo: PromoRepo = defaultPromoRepo,
    private readonly bundleRepo: BundleRepo = defaultBundleRepo,
  ) {}

  private async ensurePublished(tenantId: string): Promise<PublicSiteConfig> {
    const config = await this.repo.findSiteConfig(tenantId);
    if (!config || !config.websiteEnabled || !config.isPublished) {
      throw createError("Site not found", 404);
    }
    return config;
  }

  async getSite(tenantId: string): Promise<{
    branding: unknown;
    contact: unknown;
    features: unknown;
    seo: unknown;
    themeTokens: unknown;
    analytics: unknown;
    navigation: unknown;
    template: PublicSiteConfig["template"];
    locale: string;
    locales: string[];
    currency: string;
  }> {
    const config = await this.ensurePublished(tenantId);
    const locales = config.locales ?? [];
    const locale = config.defaultLocale ?? locales[0] ?? "en";
    return {
      branding: config.branding,
      contact: config.contact,
      features: config.features,
      seo: config.seo,
      themeTokens: config.themeTokens,
      analytics: config.analytics,
      // Navigation { primary, utility, footer } is populated on Apply by
      // seedNavigationFromBlueprint and edited via the Site editor's
      // Navigation tab. NavBarBlock + footer blocks read this on the
      // storefront so a single edit propagates to every header instance
      // without touching the per-block items prop.
      navigation: config.navigation,
      template: config.template,
      locale,
      locales,
      currency: config.currency ?? "NPR",
    };
  }

  async listProducts(
    tenantId: string,
    query: ListProductsQuery,
  ): Promise<{
    products: unknown[];
    total: number;
    page: number;
    limit: number;
    facets: unknown;
  }> {
    await this.ensurePublished(tenantId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 24;
    // Facet computation adds three extra queries (brand groupBy, price
    // aggregate, variation-attribute join) and is only rendered by the
    // products-index sidebar. Every other consumer (home carousels, PDP
    // related grid, previews) omits `?includeFacets=1` and gets `null`.
    const [products, total, facets] = await this.repo.listProducts(tenantId, {
      page,
      limit,
      categoryId: query.categoryId,
      search: query.search,
      sort: query.sort,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      vendorId: query.vendorId,
      attr: query.attr,
      includeFacets: query.includeFacets === true,
    });
    return { products, total, page, limit, facets };
  }

  async getProduct(tenantId: string, id: string) {
    await this.ensurePublished(tenantId);
    const product = await this.repo.findProduct(tenantId, id);
    if (!product) throw createError("Product not found", 404);
    return product;
  }

  async listCategories(tenantId: string) {
    await this.ensurePublished(tenantId);
    return this.repo.listCategories(tenantId);
  }

  /**
   * Products on active discount, newest discount first. Reuses the
   * product-list shape so cards render identically on /offers and on a
   * home-page offers carousel.
   */
  async listOffers(
    tenantId: string,
    query: ListProductsQuery,
  ): Promise<{
    products: unknown[];
    total: number;
    page: number;
    limit: number;
  }> {
    await this.ensurePublished(tenantId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 24;
    const [products, total] = await this.repo.listProducts(tenantId, {
      page,
      limit,
      sort: query.sort ?? "newest",
      onOfferOnly: true,
    });
    return { products, total, page, limit };
  }

  /**
   * Currently-active promo codes for the tenant. "Active" =
   * `isActive=true`, not soft-deleted, and either no validity window or
   * the current time is within it. Used by the PromoCardsBlock on the
   * /offers page to surface live discount codes to shoppers.
   *
   * Returns a public DTO that strips operator-only fields (usageLimit,
   * deleted* fields, etc.) so we don't leak internal counters to the
   * public internet.
   */
  async listActivePromos(tenantId: string): Promise<{
    promos: Array<{
      id: string;
      code: string;
      description: string | null;
      valueType: string;
      value: string;
      validFrom: string | null;
      validTo: string | null;
    }>;
  }> {
    await this.ensurePublished(tenantId);
    const now = new Date();
    const where = {
      tenantId,
      isActive: true,
      deletedAt: null,
    } as const;
    const total = await this.promoRepo.count(where);
    if (total === 0) return { promos: [] };
    const rows = await this.promoRepo.findMany(
      where,
      { createdAt: "desc" },
      0,
      Math.min(total, 50),
    );
    const active = rows.filter((p) => {
      if (p.validFrom && new Date(p.validFrom) > now) return false;
      if (p.validTo && new Date(p.validTo) < now) return false;
      return true;
    });
    return {
      promos: active.map((p) => ({
        id: p.id,
        code: p.code,
        description: p.description ?? null,
        valueType: p.valueType,
        value: p.value.toString(),
        validFrom: p.validFrom ? p.validFrom.toISOString() : null,
        validTo: p.validTo ? p.validTo.toISOString() : null,
      })),
    };
  }

  /**
   * List the tenant's active collections — used by CollectionCardsBlock's
   * `source="auto"` mode to render real, editor-managed collections instead
   * of hardcoded placeholders. The list shape is intentionally narrow: each
   * card only needs slug + title + subtitle to render. Product cover images
   * stay out so this stays a single fast query.
   */
  async listActiveCollections(
    tenantId: string,
    limit = 6,
  ): Promise<{
    collections: Array<{
      id: string;
      slug: string;
      title: string;
      subtitle: string | null;
    }>;
  }> {
    await this.ensurePublished(tenantId);
    const rows = await this.collectionsRepo.list(tenantId);
    const active = rows
      .filter((c) => c.isActive)
      .slice(0, Math.max(1, Math.min(limit, 24)))
      .map((c) => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        subtitle: c.subtitle,
      }));
    return { collections: active };
  }

  /**
   * Resolve a bundle by slug — returns the bundle row with productIds
   * dereferenced into product summaries (id/name/finalSp). Missing or
   * soft-deleted productIds are silently dropped while order is preserved,
   * matching the existing dereference contract used in the admin module.
   *
   * Used by BundleSpotlightBlock so a dropped block can render real product
   * lists tied to a real Bundle row, not a hardcoded slug placeholder.
   */
  async getBundleBySlug(
    tenantId: string,
    slug: string,
  ): Promise<{
    bundle: {
      id: string;
      slug: string;
      name: string;
      description: string | null;
      productIds: string[];
      pricingStrategy: string;
      discountPct: number | null;
      fixedPrice: number | null;
      active: boolean;
      createdAt: string;
      updatedAt: string;
    };
    products: Array<{ id: string; name: string; finalSp: string }>;
  }> {
    await this.ensurePublished(tenantId);
    const bundle = await this.bundleRepo.findActiveBySlug(tenantId, slug);
    if (!bundle) throw createError("Bundle not found", 404);
    const products = await this.bundleRepo.dereferenceProducts(
      tenantId,
      bundle.productIds,
    );
    return {
      bundle: {
        id: bundle.id,
        slug: bundle.slug,
        name: bundle.name,
        description: bundle.description,
        productIds: bundle.productIds,
        pricingStrategy: bundle.pricingStrategy,
        discountPct: bundle.discountPct,
        fixedPrice: bundle.fixedPrice,
        active: bundle.active,
        createdAt: bundle.createdAt.toISOString(),
        updatedAt: bundle.updatedAt.toISOString(),
      },
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        finalSp: p.finalSp.toString(),
      })),
    };
  }

  /**
   * Resolve a collection by slug + return its curated product order.
   * Used by the product-grid block's `source="collection"` variant and
   * by any other renderer that wants to show an admin-curated list.
   */
  async getCollectionBySlug(
    tenantId: string,
    slug: string,
    limit = 24,
  ): Promise<{
    slug: string;
    title: string;
    subtitle: string | null;
    products: unknown[];
  }> {
    await this.ensurePublished(tenantId);
    const collection = await this.collectionsRepo.findBySlug(tenantId, slug);
    if (!collection || !collection.isActive) {
      throw createError("Collection not found", 404);
    }
    const products = await this.repo.listCollectionProducts(
      tenantId,
      collection.id,
      limit,
    );
    return {
      slug: collection.slug,
      title: collection.title,
      subtitle: collection.subtitle,
      products,
    };
  }

  /**
   * Public product reviews — APPROVED only. Does not 404 when the product
   * is missing or unpublished; returns an empty list so the PDP can render
   * even if the product was just soft-deleted mid-page-load. Rating sort
   * is createdAt desc so newest reviews surface first.
   */
  async listProductReviews(
    tenantId: string,
    productId: string,
    query: ListReviewsPublicQuery,
  ): Promise<{
    reviews: {
      id: string;
      rating: number;
      body: string | null;
      authorName: string | null;
      createdAt: Date;
    }[];
    total: number;
    page: number;
    limit: number;
  }> {
    await this.ensurePublished(tenantId);
    const { rows, total } = await this.repo.listApprovedReviews(
      tenantId,
      productId,
      query.page,
      query.limit,
    );
    return { reviews: rows, total, page: query.page, limit: query.limit };
  }

  /**
   * Accept a public review submission. Status is hard-coded to PENDING —
   * admins flip it to APPROVED/REJECTED via the admin /reviews endpoints.
   * The submitter's IP is captured for abuse review; it never leaves the
   * moderation surface.
   */
  async submitProductReview(
    tenantId: string,
    productId: string,
    input: SubmitReviewInput,
    submittedIp: string | null,
  ): Promise<{ id: string; status: "PENDING" | "APPROVED" | "REJECTED" }> {
    await this.ensurePublished(tenantId);
    const product = await this.repo.findProductIdForTenant(tenantId, productId);
    if (!product) throw createError("Product not found", 404);
    return this.repo.createPendingReview(tenantId, {
      productId,
      rating: input.rating,
      body: input.body ?? null,
      authorName: input.authorName ?? null,
      authorEmail: input.authorEmail ?? null,
      submittedIp,
    });
  }

  /**
   * Frequently-bought-with for a PDP cross-sell row. 404s when the site
   * isn't published; returns an empty list (not 404) when the product has
   * no co-purchase signal yet, so the PDP can render a graceful "no
   * recommendations" state without a second request.
   */
  async listFrequentlyBoughtWith(
    tenantId: string,
    productId: string,
  ): Promise<{ products: unknown[] }> {
    await this.ensurePublished(tenantId);
    const product = await this.repo.findProductIdForTenant(tenantId, productId);
    if (!product) throw createError("Product not found", 404);
    const products = await this.repo.listFrequentlyBoughtWith(
      tenantId,
      productId,
    );
    return { products };
  }
}

export default new PublicSiteService();
