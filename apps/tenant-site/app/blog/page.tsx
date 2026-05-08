import type { Metadata } from "next";
import { getTenantContext } from "@/lib/tenant";
import {
  getBlogPosts,
  getBlogCategories,
  getSiteWithProfile,
  getCategories,
  getNavPages,
  getSiteLayout,
} from "@/lib/api";
import { BlogPageShell } from "@/components/blog/BlogPageShell";
import { BlogList } from "@/components/blog/BlogList";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import type { BlockDataContext } from "@/components/blocks/data-context";
import type { BlockNode } from "@repo/shared";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Journal",
  description: "Stories, craft notes, and updates from the team.",
};

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const ctx = await getTenantContext();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const limit = 12;

  const [
    list,
    categories,
    site,
    siteCategories,
    navPages,
    headerLayout,
    pageLayout,
    footerLayout,
  ] = await Promise.all([
    getBlogPosts(ctx.host, ctx.tenantId, { page, limit }),
    getBlogCategories(ctx.host, ctx.tenantId),
    getSiteWithProfile(ctx.host, ctx.tenantId, ctx.tenantSlug),
    getCategories(ctx.host, ctx.tenantId),
    getNavPages(ctx.host, ctx.tenantId),
    getSiteLayout(ctx.host, ctx.tenantId, "header").catch(() => null),
    getSiteLayout(ctx.host, ctx.tenantId, "blog-index").catch(() => null),
    getSiteLayout(ctx.host, ctx.tenantId, "footer").catch(() => null),
  ]);

  if (
    site &&
    pageLayout &&
    Array.isArray(pageLayout.blocks) &&
    pageLayout.blocks.length > 0
  ) {
    const blocks = [
      ...(Array.isArray(headerLayout?.blocks)
        ? (headerLayout.blocks as BlockNode[])
        : []),
      ...(Array.isArray(pageLayout.blocks)
        ? (pageLayout.blocks as BlockNode[])
        : []),
      ...(Array.isArray(footerLayout?.blocks)
        ? (footerLayout.blocks as BlockNode[])
        : []),
    ];

    const dataContext: BlockDataContext = {
      site,
      host: ctx.host,
      tenantId: ctx.tenantId,
      categories: siteCategories,
      navPages,
      products: [],
      featuredBlogPosts: list.posts,
    };
    return (
      <>
        <main>
          <BlockRenderer nodes={blocks} dataContext={dataContext} />
        </main>
      </>
    );
  }

  return (
    <BlogPageShell>
      <h1
        style={{
          fontSize: "2.5rem",
          marginBottom: "0.5rem",
          fontFamily: "var(--font-display)",
          color: "var(--color-text)",
        }}
      >
        Journal
      </h1>
      <p
        style={{
          color: "var(--color-muted)",
          marginBottom: "2.5rem",
          fontSize: "1rem",
        }}
      >
        Stories, craft notes, and updates from the team.
      </p>
      <BlogList
        posts={list.posts}
        categories={categories}
        total={list.total}
        page={list.page}
        limit={list.limit}
      />
    </BlogPageShell>
  );
}
