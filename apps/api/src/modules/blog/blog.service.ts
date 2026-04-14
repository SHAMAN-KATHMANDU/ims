/**
 * Tenant-scoped blog service.
 *
 * Every mutation:
 *   1. Asserts the tenant's SiteConfig exists and `websiteEnabled=true`
 *      (blog is part of the "website" product — no website, no blog)
 *   2. Writes to the DB
 *   3. Fires a revalidation to the tenant-site renderer
 *
 * Slug uniqueness is enforced at the DB level; we convert Prisma P2002 into
 * a 409 response. Publishing sets `publishedAt` to "now" on first publish,
 * but leaves the original `publishedAt` untouched on republish so "published
 * on 2026-04-01" doesn't change the second time you toggle the switch.
 */

import { Prisma } from "@prisma/client";
import sitesRepo from "@/modules/sites/sites.repository";
import { createError } from "@/middlewares/errorHandler";
import defaultRepo, {
  type BlogPostListItem,
  type BlogPostWithCategory,
} from "./blog.repository";
import type {
  CreateBlogCategoryInput,
  CreateBlogPostInput,
  ListBlogPostsQuery,
  UpdateBlogCategoryInput,
  UpdateBlogPostInput,
} from "./blog.schema";
import { computeReadingMinutes } from "./blog.schema";
import {
  revalidateBlog as defaultRevalidate,
  type RevalidateBlogOpts,
} from "./blog.revalidate";

type Repo = typeof defaultRepo;
type SitesRepo = typeof sitesRepo;
type Revalidate = (
  tenantId: string,
  opts?: RevalidateBlogOpts,
) => Promise<void>;

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

export class BlogService {
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

  // ==================== POSTS ====================

  async listPosts(
    tenantId: string,
    query: ListBlogPostsQuery,
  ): Promise<{
    posts: BlogPostListItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    await this.assertEnabled(tenantId);
    const [posts, total] = await this.repo.listPosts(tenantId, {
      page: query.page,
      limit: query.limit,
      status: query.status,
      categoryId: query.categoryId,
      search: query.search,
    });
    return { posts, total, page: query.page, limit: query.limit };
  }

  async getPost(tenantId: string, id: string): Promise<BlogPostWithCategory> {
    await this.assertEnabled(tenantId);
    const post = await this.repo.getPostById(tenantId, id);
    if (!post) throw createError("Blog post not found", 404);
    return post;
  }

  async createPost(
    tenantId: string,
    input: CreateBlogPostInput,
  ): Promise<BlogPostWithCategory> {
    await this.assertEnabled(tenantId);

    if (input.categoryId) {
      const category = await this.repo.getCategoryById(
        tenantId,
        input.categoryId,
      );
      if (!category) throw createError("Blog category not found", 404);
    }

    const data: Omit<Prisma.BlogPostCreateInput, "tenant"> = {
      slug: input.slug,
      title: input.title,
      excerpt: input.excerpt ?? null,
      bodyMarkdown: input.bodyMarkdown,
      heroImageUrl: input.heroImageUrl ?? null,
      authorName: input.authorName ?? null,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      tags: input.tags ?? [],
      readingMinutes: computeReadingMinutes(input.bodyMarkdown),
      ...(input.categoryId
        ? { category: { connect: { id: input.categoryId } } }
        : {}),
    };

    try {
      const post = await this.repo.createPost(tenantId, data);
      await this.revalidate(tenantId, { slug: post.slug });
      return post;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw createError("A post with this slug already exists", 409);
      }
      throw err;
    }
  }

  async updatePost(
    tenantId: string,
    id: string,
    input: UpdateBlogPostInput,
  ): Promise<BlogPostWithCategory> {
    await this.assertEnabled(tenantId);

    const existing = await this.repo.getPostById(tenantId, id);
    if (!existing) throw createError("Blog post not found", 404);

    if (input.categoryId) {
      const category = await this.repo.getCategoryById(
        tenantId,
        input.categoryId,
      );
      if (!category) throw createError("Blog category not found", 404);
    }

    const data: Prisma.BlogPostUpdateInput = {};
    if (input.slug !== undefined) data.slug = input.slug;
    if (input.title !== undefined) data.title = input.title;
    if (input.excerpt !== undefined) data.excerpt = input.excerpt ?? null;
    if (input.bodyMarkdown !== undefined) {
      data.bodyMarkdown = input.bodyMarkdown;
      data.readingMinutes = computeReadingMinutes(input.bodyMarkdown);
    }
    if (input.heroImageUrl !== undefined) {
      data.heroImageUrl = input.heroImageUrl ?? null;
    }
    if (input.authorName !== undefined) {
      data.authorName = input.authorName ?? null;
    }
    if (input.seoTitle !== undefined) data.seoTitle = input.seoTitle ?? null;
    if (input.seoDescription !== undefined) {
      data.seoDescription = input.seoDescription ?? null;
    }
    if (input.tags !== undefined) data.tags = input.tags;
    if (input.categoryId !== undefined) {
      data.category = input.categoryId
        ? { connect: { id: input.categoryId } }
        : { disconnect: true };
    }

    try {
      const post = await this.repo.updatePost(tenantId, id, data);
      // Revalidate both the old slug (in case it changed) and the new one.
      await this.revalidate(tenantId, { slug: post.slug });
      if (existing.slug !== post.slug) {
        await this.revalidate(tenantId, { slug: existing.slug });
      }
      return post;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw createError("A post with this slug already exists", 409);
      }
      throw err;
    }
  }

  async publishPost(
    tenantId: string,
    id: string,
  ): Promise<BlogPostWithCategory> {
    await this.assertEnabled(tenantId);
    const existing = await this.repo.getPostById(tenantId, id);
    if (!existing) throw createError("Blog post not found", 404);

    const data: Prisma.BlogPostUpdateInput = { status: "PUBLISHED" };
    // Preserve publishedAt on re-publish so the original publication date
    // doesn't bounce around every time a post is toggled.
    if (!existing.publishedAt) {
      data.publishedAt = new Date();
    }

    const post = await this.repo.updatePost(tenantId, id, data);
    await this.revalidate(tenantId, { slug: post.slug });
    return post;
  }

  async unpublishPost(
    tenantId: string,
    id: string,
  ): Promise<BlogPostWithCategory> {
    await this.assertEnabled(tenantId);
    const existing = await this.repo.getPostById(tenantId, id);
    if (!existing) throw createError("Blog post not found", 404);

    const post = await this.repo.updatePost(tenantId, id, { status: "DRAFT" });
    await this.revalidate(tenantId, { slug: post.slug });
    return post;
  }

  async deletePost(tenantId: string, id: string): Promise<void> {
    await this.assertEnabled(tenantId);
    const existing = await this.repo.getPostById(tenantId, id);
    if (!existing) throw createError("Blog post not found", 404);

    await this.repo.deletePost(tenantId, id);
    await this.revalidate(tenantId, { slug: existing.slug });
  }

  // ==================== CATEGORIES ====================

  async listCategories(tenantId: string) {
    await this.assertEnabled(tenantId);
    return this.repo.listCategories(tenantId);
  }

  async createCategory(tenantId: string, input: CreateBlogCategoryInput) {
    await this.assertEnabled(tenantId);
    try {
      const category = await this.repo.createCategory(tenantId, {
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        sortOrder: input.sortOrder ?? 0,
      });
      await this.revalidate(tenantId);
      return category;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw createError("A category with this slug already exists", 409);
      }
      throw err;
    }
  }

  async updateCategory(
    tenantId: string,
    id: string,
    input: UpdateBlogCategoryInput,
  ) {
    await this.assertEnabled(tenantId);
    const existing = await this.repo.getCategoryById(tenantId, id);
    if (!existing) throw createError("Blog category not found", 404);

    const data: Prisma.BlogCategoryUpdateInput = {};
    if (input.slug !== undefined) data.slug = input.slug;
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) {
      data.description = input.description ?? null;
    }
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

    try {
      const category = await this.repo.updateCategory(tenantId, id, data);
      await this.revalidate(tenantId);
      return category;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw createError("A category with this slug already exists", 409);
      }
      throw err;
    }
  }

  async deleteCategory(tenantId: string, id: string): Promise<void> {
    await this.assertEnabled(tenantId);
    const existing = await this.repo.getCategoryById(tenantId, id);
    if (!existing) throw createError("Blog category not found", 404);

    await this.repo.deleteCategory(tenantId, id);
    await this.revalidate(tenantId);
  }
}

export default new BlogService();
