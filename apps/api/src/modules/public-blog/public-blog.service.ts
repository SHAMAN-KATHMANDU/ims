/**
 * Public blog service — read-only content for unauthenticated visitors.
 *
 * Tenant is resolved from the request Host header by the resolveTenantFromHostname
 * middleware before we ever get here. Every method also asserts the tenant's
 * SiteConfig is websiteEnabled + isPublished, returning 404 when not — we
 * don't want to leak the existence of unpublished sites.
 */

import sitesRepo from "@/modules/sites/sites.repository";
import { createError } from "@/middlewares/errorHandler";
import defaultRepo, {
  type PublicBlogListItem,
  type PublicBlogPost,
} from "./public-blog.repository";
import type { FeaturedQuery, ListPublicPostsQuery } from "./public-blog.schema";

type Repo = typeof defaultRepo;
type SitesRepo = typeof sitesRepo;

export class PublicBlogService {
  constructor(
    private readonly repo: Repo = defaultRepo,
    private readonly sites: SitesRepo = sitesRepo,
  ) {}

  private async ensurePublished(tenantId: string): Promise<void> {
    const config = await this.sites.findConfig(tenantId);
    if (!config || !config.websiteEnabled || !config.isPublished) {
      throw createError("Not found", 404);
    }
  }

  async listPosts(
    tenantId: string,
    query: ListPublicPostsQuery,
  ): Promise<{
    posts: PublicBlogListItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    await this.ensurePublished(tenantId);

    let categoryId: string | undefined;
    if (query.categorySlug) {
      const category = await this.repo.findCategoryBySlug(
        tenantId,
        query.categorySlug,
      );
      if (!category) throw createError("Category not found", 404);
      categoryId = category.id;
    }

    const [posts, total] = await this.repo.listPosts(tenantId, {
      page: query.page,
      limit: query.limit,
      categoryId,
      tag: query.tag,
    });

    return { posts, total, page: query.page, limit: query.limit };
  }

  async getPostBySlug(
    tenantId: string,
    slug: string,
  ): Promise<{
    post: PublicBlogPost;
    related: PublicBlogListItem[];
  }> {
    await this.ensurePublished(tenantId);
    const post = await this.repo.findPostBySlug(tenantId, slug);
    if (!post) throw createError("Post not found", 404);

    const related = await this.repo.findRelatedPosts(tenantId, {
      categoryId: post.category?.id ?? null,
      excludeId: post.id,
      limit: 3,
    });

    return { post, related };
  }

  async listFeatured(
    tenantId: string,
    query: FeaturedQuery,
  ): Promise<PublicBlogListItem[]> {
    await this.ensurePublished(tenantId);
    return this.repo.listFeatured(tenantId, query.limit);
  }

  async listCategories(tenantId: string) {
    await this.ensurePublished(tenantId);
    return this.repo.listCategoriesWithCounts(tenantId);
  }
}

export default new PublicBlogService();
