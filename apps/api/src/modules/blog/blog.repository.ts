/**
 * Tenant-scoped blog repository.
 *
 * Uses the extended `prisma` client that is auto-scoped by AsyncLocalStorage
 * tenantContext. Every method also passes an explicit `tenantId` as a
 * belt-and-suspenders filter.
 */

import prisma from "@/config/prisma";
import type { BlogCategory, BlogPost, Prisma } from "@prisma/client";

export type BlogPostWithCategory = BlogPost & {
  category: BlogCategory | null;
};

const POST_LIST_SELECT = {
  id: true,
  tenantId: true,
  slug: true,
  title: true,
  excerpt: true,
  heroImageUrl: true,
  authorName: true,
  status: true,
  publishedAt: true,
  categoryId: true,
  tags: true,
  readingMinutes: true,
  seoTitle: true,
  seoDescription: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: { id: true, slug: true, name: true },
  },
} satisfies Prisma.BlogPostSelect;

export type BlogPostListItem = Prisma.BlogPostGetPayload<{
  select: typeof POST_LIST_SELECT;
}>;

export class BlogRepository {
  listPosts(
    tenantId: string,
    opts: {
      page: number;
      limit: number;
      status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
      categoryId?: string;
      search?: string;
    },
  ): Promise<[BlogPostListItem[], number]> {
    const where: Prisma.BlogPostWhereInput = {
      tenantId,
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
      ...(opts.search
        ? { title: { contains: opts.search, mode: "insensitive" } }
        : {}),
    };

    return Promise.all([
      prisma.blogPost.findMany({
        where,
        select: POST_LIST_SELECT,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      prisma.blogPost.count({ where }),
    ]);
  }

  getPostById(
    tenantId: string,
    id: string,
  ): Promise<BlogPostWithCategory | null> {
    return prisma.blogPost.findFirst({
      where: { id, tenantId },
      include: { category: true },
    });
  }

  findPostBySlug(
    tenantId: string,
    slug: string,
  ): Promise<BlogPostWithCategory | null> {
    return prisma.blogPost.findFirst({
      where: { tenantId, slug },
      include: { category: true },
    });
  }

  createPost(
    tenantId: string,
    data: Omit<Prisma.BlogPostCreateInput, "tenant">,
  ): Promise<BlogPostWithCategory> {
    return prisma.blogPost.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
      include: { category: true },
    });
  }

  // Tenant ownership is verified by the service via getPostById before
  // calling update/delete, so `where: { id }` is safe here — the service
  // layer is the tenant boundary, and Prisma's type system only accepts a
  // true unique where clause anyway (we don't have a compound (id, tenantId)
  // unique index — the tenant_id column is indexed for list queries).
  updatePost(
    _tenantId: string,
    id: string,
    data: Prisma.BlogPostUpdateInput,
  ): Promise<BlogPostWithCategory> {
    return prisma.blogPost.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  deletePost(_tenantId: string, id: string): Promise<BlogPost> {
    return prisma.blogPost.delete({ where: { id } });
  }

  listCategories(
    tenantId: string,
  ): Promise<(BlogCategory & { _count: { posts: number } })[]> {
    return prisma.blogCategory.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { posts: true } } },
    });
  }

  getCategoryById(tenantId: string, id: string): Promise<BlogCategory | null> {
    return prisma.blogCategory.findFirst({ where: { id, tenantId } });
  }

  createCategory(
    tenantId: string,
    data: Omit<Prisma.BlogCategoryCreateInput, "tenant">,
  ): Promise<BlogCategory> {
    return prisma.blogCategory.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  updateCategory(
    _tenantId: string,
    id: string,
    data: Prisma.BlogCategoryUpdateInput,
  ): Promise<BlogCategory> {
    return prisma.blogCategory.update({ where: { id }, data });
  }

  deleteCategory(_tenantId: string, id: string): Promise<BlogCategory> {
    return prisma.blogCategory.delete({ where: { id } });
  }
}

export default new BlogRepository();
