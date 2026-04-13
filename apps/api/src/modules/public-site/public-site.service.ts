/**
 * Public site service — serves read-only tenant content over unauthenticated
 * endpoints. All methods first assert that the tenant has a SiteConfig with
 * `websiteEnabled=true` AND `isPublished=true`; otherwise they return 404 so
 * the existence of the tenant isn't leaked to the public internet.
 */

import { createError } from "@/middlewares/errorHandler";
import defaultRepo, { type PublicSiteConfig } from "./public-site.repository";
import type { ListProductsQuery } from "./public-site.schema";

type Repo = typeof defaultRepo;

export class PublicSiteService {
  constructor(private readonly repo: Repo = defaultRepo) {}

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
    template: PublicSiteConfig["template"];
  }> {
    const config = await this.ensurePublished(tenantId);
    return {
      branding: config.branding,
      contact: config.contact,
      features: config.features,
      seo: config.seo,
      template: config.template,
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
  }> {
    await this.ensurePublished(tenantId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 24;
    const [products, total] = await this.repo.listProducts(tenantId, {
      page,
      limit,
      categoryId: query.categoryId,
      search: query.search,
    });
    return { products, total, page, limit };
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
}

export default new PublicSiteService();
