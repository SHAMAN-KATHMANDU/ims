/**
 * Public blog repository — read-only queries for unauthenticated visitors.
 * Only returns PUBLISHED posts with `publishedAt <= now()`.
 */

import prisma from "@/config/prisma";
import type { BlogCategory, Prisma } from "@prisma/client";

const PUBLIC_POST_SELECT = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  bodyMarkdown: true,
  heroImageUrl: true,
  coverImageUrl: true,
  icon: true,
  authorName: true,
  publishedAt: true,
  tags: true,
  readingMinutes: true,
  seoTitle: true,
  seoDescription: true,
  category: { select: { id: true, slug: true, name: true } },
} satisfies Prisma.BlogPostSelect;

const PUBLIC_LIST_SELECT = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  heroImageUrl: true,
  coverImageUrl: true,
  icon: true,
  authorName: true,
  publishedAt: true,
  tags: true,
  readingMinutes: true,
  category: { select: { id: true, slug: true, name: true } },
} satisfies Prisma.BlogPostSelect;

export type PublicBlogPost = Prisma.BlogPostGetPayload<{
  select: typeof PUBLIC_POST_SELECT;
}>;

export type PublicBlogListItem = Prisma.BlogPostGetPayload<{
  select: typeof PUBLIC_LIST_SELECT;
}>;

function publishedWhere(
  tenantId: string,
  extra: Prisma.BlogPostWhereInput = {},
): Prisma.BlogPostWhereInput {
  return {
    tenantId,
    status: "PUBLISHED",
    publishedAt: { lte: new Date() },
    ...extra,
  };
}

export class PublicBlogRepository {
  async findCategoryBySlug(
    tenantId: string,
    slug: string,
  ): Promise<BlogCategory | null> {
    return prisma.blogCategory.findFirst({ where: { tenantId, slug } });
  }

  listPosts(
    tenantId: string,
    opts: {
      page: number;
      limit: number;
      categoryId?: string;
      tag?: string;
    },
  ): Promise<[PublicBlogListItem[], number]> {
    const where = publishedWhere(tenantId, {
      ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
      ...(opts.tag ? { tags: { has: opts.tag } } : {}),
    });

    return Promise.all([
      prisma.blogPost.findMany({
        where,
        select: PUBLIC_LIST_SELECT,
        orderBy: [{ publishedAt: "desc" }],
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      prisma.blogPost.count({ where }),
    ]);
  }

  findPostBySlug(
    tenantId: string,
    slug: string,
  ): Promise<PublicBlogPost | null> {
    return prisma.blogPost.findFirst({
      where: publishedWhere(tenantId, { slug }),
      select: PUBLIC_POST_SELECT,
    });
  }

  findRelatedPosts(
    tenantId: string,
    opts: { categoryId: string | null; excludeId: string; limit: number },
  ): Promise<PublicBlogListItem[]> {
    return prisma.blogPost.findMany({
      where: publishedWhere(tenantId, {
        id: { not: opts.excludeId },
        ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
      }),
      select: PUBLIC_LIST_SELECT,
      orderBy: [{ publishedAt: "desc" }],
      take: opts.limit,
    });
  }

  listFeatured(tenantId: string, limit: number): Promise<PublicBlogListItem[]> {
    return prisma.blogPost.findMany({
      where: publishedWhere(tenantId),
      select: PUBLIC_LIST_SELECT,
      orderBy: [{ publishedAt: "desc" }],
      take: limit,
    });
  }

  listCategoriesWithCounts(
    tenantId: string,
  ): Promise<Array<BlogCategory & { postCount: number }>> {
    return prisma.blogCategory
      .findMany({
        where: { tenantId },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          _count: {
            select: {
              posts: {
                where: {
                  status: "PUBLISHED",
                  publishedAt: { lte: new Date() },
                },
              },
            },
          },
        },
      })
      .then((rows) =>
        rows.map((r) => {
          const { _count, ...rest } = r;
          return { ...rest, postCount: _count.posts };
        }),
      );
  }
}

export default new PublicBlogRepository();
