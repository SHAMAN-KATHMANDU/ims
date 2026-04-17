/**
 * Public site service — serves read-only tenant content over unauthenticated
 * endpoints. All methods first assert that the tenant has a SiteConfig with
 * `websiteEnabled=true` AND `isPublished=true`; otherwise they return 404 so
 * the existence of the tenant isn't leaked to the public internet.
 */

import { createError } from "@/middlewares/errorHandler";
import defaultRepo, { type PublicSiteConfig } from "./public-site.repository";
import type { ListProductsQuery } from "./public-site.schema";
import defaultCollectionsRepo from "@/modules/collections/collections.repository";

type Repo = typeof defaultRepo;
type CollectionsRepo = typeof defaultCollectionsRepo;

export class PublicSiteService {
  constructor(
    private readonly repo: Repo = defaultRepo,
    private readonly collectionsRepo: CollectionsRepo = defaultCollectionsRepo,
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
    template: PublicSiteConfig["template"];
    locale: string;
    locales: string[];
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
      template: config.template,
      locale,
      locales,
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
    // The products-index route is the only caller that renders a
    // facet sidebar, so it's also the only caller that pays for
    // facet computation. Other consumers (home page grids, carousels,
    // PDP related products, preview) get a null facets field.
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
      includeFacets: true,
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
}

export default new PublicSiteService();
