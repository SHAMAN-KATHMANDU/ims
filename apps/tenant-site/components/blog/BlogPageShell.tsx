import type { ReactNode } from "react";
import { getTenantContext } from "@/lib/tenant";
import { getSite, getCategories, getNavPages, getSiteLayout } from "@/lib/api";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import type { BlockDataContext } from "@/components/blocks/data-context";
import type { BlockNode } from "@repo/shared";
import { notFound } from "next/navigation";

/**
 * Shell for every blog page — renders scope-aware chrome (header/footer)
 * via BlockRenderer so a visitor arriving at /blog sees the same chrome
 * they saw on the homepage, regardless of which template the tenant has picked.
 */
export async function BlogPageShell({
  children,
  cover,
}: {
  children: ReactNode;
  /**
   * Optional full-bleed slot rendered between header and the article
   * container — sits outside `.container` so it can span the viewport.
   * Used by the post-detail route to render the Phase-8 cover image.
   */
  cover?: ReactNode;
}) {
  const ctx = await getTenantContext();
  const [site, categories, navPages, headerLayout, footerLayout] =
    await Promise.all([
      getSite(ctx.host, ctx.tenantId),
      getCategories(ctx.host, ctx.tenantId),
      getNavPages(ctx.host, ctx.tenantId),
      getSiteLayout(ctx.host, ctx.tenantId, "header").catch(() => null),
      getSiteLayout(ctx.host, ctx.tenantId, "footer").catch(() => null),
    ]);
  if (!site) notFound();

  const blocks = [
    ...(Array.isArray(headerLayout?.blocks)
      ? (headerLayout.blocks as BlockNode[])
      : []),
    ...(Array.isArray(footerLayout?.blocks)
      ? (footerLayout.blocks as BlockNode[])
      : []),
  ];

  const dataContext: BlockDataContext = {
    site,
    host: ctx.host,
    tenantId: ctx.tenantId,
    categories,
    navPages,
    products: [],
    featuredBlogPosts: [],
  };

  return (
    <div data-page="blog">
      <BlockRenderer nodes={blocks} dataContext={dataContext} />
      {cover}
      <main
        className="container"
        style={{ padding: cover ? "2rem 0 3rem" : "3rem 0" }}
      >
        {children}
      </main>
    </div>
  );
}
