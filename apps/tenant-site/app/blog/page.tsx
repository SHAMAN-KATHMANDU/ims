import { getTenantContext } from "@/lib/tenant";
import {
  getBlogPosts,
  getBlogCategories,
  getSite,
  getCategories,
  getNavPages,
  getSiteLayout,
} from "@/lib/api";
import { BlogPageShell } from "@/components/blog/BlogPageShell";
import { BlogList } from "@/components/blog/BlogList";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { SiteHeader, SiteFooter } from "@/components/templates/shared";
import type { BlockDataContext } from "@/components/blocks/data-context";
import type { BlockNode } from "@repo/shared";

export const dynamic = "force-dynamic";

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const ctx = await getTenantContext();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const limit = 12;

  const [list, categories, site, siteCategories, navPages, layout] =
    await Promise.all([
      getBlogPosts(ctx.host, ctx.tenantId, { page, limit }),
      getBlogCategories(ctx.host, ctx.tenantId),
      getSite(ctx.host, ctx.tenantId),
      getCategories(ctx.host, ctx.tenantId),
      getNavPages(ctx.host, ctx.tenantId),
      getSiteLayout(ctx.host, ctx.tenantId, "blog-index").catch(() => null),
    ]);

  if (
    site &&
    layout &&
    Array.isArray(layout.blocks) &&
    layout.blocks.length > 0
  ) {
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
        <SiteHeader
          site={site}
          host={ctx.host}
          categories={siteCategories}
          navPages={navPages}
        />
        <main>
          <BlockRenderer
            nodes={layout.blocks as BlockNode[]}
            dataContext={dataContext}
          />
        </main>
        <SiteFooter site={site} host={ctx.host} navPages={navPages} />
      </>
    );
  }

  return (
    <BlogPageShell>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>Journal</h1>
      <p
        style={{
          color: "rgba(0,0,0,0.6)",
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
