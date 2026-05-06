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
import { blocksToMarkdown, type BlockNode } from "@repo/shared";
import { snapshotBlogPost } from "@/modules/versions/versions.service";
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

/**
 * Reconcile the markdown body and the canonical block tree from input. The
 * Zod schema guarantees at least one of them is present on create; on
 * update we only touch the columns the caller actually sent.
 *
 * Output:
 *   - `body`         — BlockNode[] for the `body` JSONB column
 *   - `bodyMarkdown` — string for the legacy column (RSS / SEO / fallback)
 *   - `dirty`        — true when any body-shaped field was supplied
 *
 * If the caller sends `body`, that is canonical and `bodyMarkdown` is
 * derived from it. If the caller sends only `bodyMarkdown`, we wrap it
 * in a single `markdown-body` block so `body` stays in sync — this keeps
 * the columns lock-step regardless of which path the client took.
 */
function reconcileBody(input: { body?: BlockNode[]; bodyMarkdown?: string }): {
  body?: BlockNode[];
  bodyMarkdown?: string;
  dirty: boolean;
} {
  const hasBody = Array.isArray(input.body);
  const hasMd = typeof input.bodyMarkdown === "string";
  if (!hasBody && !hasMd) return { dirty: false };

  if (hasBody) {
    const body = input.body as BlockNode[];
    const md = blocksToMarkdown(body) || (input.bodyMarkdown ?? "");
    return { body, bodyMarkdown: md, dirty: true };
  }

  const md = input.bodyMarkdown!;
  const body: BlockNode[] = [
    {
      id: "md-1",
      kind: "markdown-body",
      props: { source: md },
    },
  ];
  return { body, bodyMarkdown: md, dirty: true };
}
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
    editorId: string | null = null,
  ): Promise<BlogPostWithCategory> {
    await this.assertEnabled(tenantId);

    if (input.categoryId) {
      const category = await this.repo.getCategoryById(
        tenantId,
        input.categoryId,
      );
      if (!category) throw createError("Blog category not found", 404);
    }

    const reconciled = reconcileBody({
      body: input.body,
      bodyMarkdown: input.bodyMarkdown,
    });
    // Schema refine guarantees one was provided on create.
    const bodyMarkdown = reconciled.bodyMarkdown ?? "";
    const body = reconciled.body ?? [];

    const data: Omit<Prisma.BlogPostCreateInput, "tenant"> = {
      slug: input.slug,
      title: input.title,
      excerpt: input.excerpt ?? null,
      bodyMarkdown,
      body: body as unknown as Prisma.InputJsonValue,
      heroImageUrl: input.heroImageUrl ?? null,
      coverImageUrl: input.coverImageUrl ?? null,
      icon: input.icon ?? null,
      authorName: input.authorName ?? null,
      scheduledPublishAt: input.scheduledPublishAt
        ? new Date(input.scheduledPublishAt)
        : null,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      tags: input.tags ?? [],
      readingMinutes: computeReadingMinutes(bodyMarkdown),
      ...(input.categoryId
        ? { category: { connect: { id: input.categoryId } } }
        : {}),
    };

    try {
      const post = await this.repo.createPost(tenantId, data);
      await this.revalidate(tenantId, { slug: post.slug });
      await snapshotBlogPost(post, post, {
        tenantId,
        editorId,
        note: "Created",
      });
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
    editorId: string | null = null,
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

    const reconciled = reconcileBody({
      body: input.body,
      bodyMarkdown: input.bodyMarkdown,
    });
    if (reconciled.dirty) {
      if (reconciled.body) {
        data.body = reconciled.body as unknown as Prisma.InputJsonValue;
      }
      if (reconciled.bodyMarkdown !== undefined) {
        data.bodyMarkdown = reconciled.bodyMarkdown;
        data.readingMinutes = computeReadingMinutes(reconciled.bodyMarkdown);
      }
    }
    if (input.heroImageUrl !== undefined) {
      data.heroImageUrl = input.heroImageUrl ?? null;
    }
    if (input.coverImageUrl !== undefined) {
      data.coverImageUrl = input.coverImageUrl ?? null;
    }
    if (input.icon !== undefined) {
      data.icon = input.icon ?? null;
    }
    if (input.authorName !== undefined) {
      data.authorName = input.authorName ?? null;
    }
    if (input.scheduledPublishAt !== undefined) {
      data.scheduledPublishAt = input.scheduledPublishAt
        ? new Date(input.scheduledPublishAt)
        : null;
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
      await snapshotBlogPost(post, post, {
        tenantId,
        editorId,
        note: "Updated",
      });
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
    editorId: string | null = null,
  ): Promise<BlogPostWithCategory> {
    await this.assertEnabled(tenantId);
    const existing = await this.repo.getPostById(tenantId, id);
    if (!existing) throw createError("Blog post not found", 404);

    const data: Prisma.BlogPostUpdateInput = {
      status: "PUBLISHED",
      // Clear any pending schedule — manual publish supersedes it; otherwise
      // the cron worker would re-fire and snapshot a duplicate "scheduled
      // publish" later.
      scheduledPublishAt: null,
    };
    // Preserve publishedAt on re-publish so the original publication date
    // doesn't bounce around every time a post is toggled.
    if (!existing.publishedAt) {
      data.publishedAt = new Date();
    }

    const post = await this.repo.updatePost(tenantId, id, data);
    await this.revalidate(tenantId, { slug: post.slug });
    await snapshotBlogPost(post, post, {
      tenantId,
      editorId,
      note: "Published",
    });
    return post;
  }

  async unpublishPost(
    tenantId: string,
    id: string,
    editorId: string | null = null,
  ): Promise<BlogPostWithCategory> {
    await this.assertEnabled(tenantId);
    const existing = await this.repo.getPostById(tenantId, id);
    if (!existing) throw createError("Blog post not found", 404);

    // Unpublish also clears any pending schedule — otherwise the cron
    // would re-publish a draft the author just demoted.
    const post = await this.repo.updatePost(tenantId, id, {
      status: "DRAFT",
      scheduledPublishAt: null,
    });
    await this.revalidate(tenantId, { slug: post.slug });
    await snapshotBlogPost(post, post, {
      tenantId,
      editorId,
      note: "Unpublished",
    });
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
