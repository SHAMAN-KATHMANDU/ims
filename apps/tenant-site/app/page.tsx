import { getTenantContext } from "@/lib/tenant";
import {
  getSiteWithProfile,
  getCategories,
  getFeaturedBlogPosts,
  getNavPages,
  getSiteLayout,
  getTenantPageBySlug,
} from "@/lib/api";
import { notFound } from "next/navigation";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import type { BlockDataContext } from "@/components/blocks/data-context";
import { buildAssetMap } from "@/components/blocks/build-asset-map";
import type { BlockNode } from "@repo/shared";
import { homeMetadata, organizationJsonLd } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const ctx = await getTenantContext();
    const site = await getSiteWithProfile(
      ctx.host,
      ctx.tenantId,
      ctx.tenantSlug,
    );
    if (!site) return {};
    return homeMetadata(site, ctx.host);
  } catch {
    return {};
  }
}

export default async function HomePage() {
  const ctx = await getTenantContext();
  const [site, page, categories, featuredBlogPosts, navPages] =
    await Promise.all([
      getSiteWithProfile(ctx.host, ctx.tenantId, ctx.tenantSlug),
      getTenantPageBySlug(ctx.host, ctx.tenantId, "/"),
      getCategories(ctx.host, ctx.tenantId),
      getFeaturedBlogPosts(ctx.host, ctx.tenantId, 3),
      getNavPages(ctx.host, ctx.tenantId),
    ]);

  if (!site) notFound();

  const [headerLayout, pageLayout, footerLayout] = await Promise.all([
    getSiteLayout(ctx.host, ctx.tenantId, "header").catch(() => null),
    page
      ? getSiteLayout(ctx.host, ctx.tenantId, "page", page.id).catch(() => null)
      : getSiteLayout(ctx.host, ctx.tenantId, "home").catch(() => null),
    getSiteLayout(ctx.host, ctx.tenantId, "footer").catch(() => null),
  ]);

  const blocks = [
    ...(Array.isArray(headerLayout?.blocks)
      ? (headerLayout.blocks as BlockNode[])
      : []),
    ...(Array.isArray(pageLayout?.blocks)
      ? (pageLayout.blocks as BlockNode[])
      : []),
    ...(Array.isArray(footerLayout?.blocks)
      ? (footerLayout.blocks as BlockNode[])
      : []),
  ];

  const assets = await buildAssetMap(ctx.host, ctx.tenantId, blocks);

  const dataContext: BlockDataContext = {
    site,
    host: ctx.host,
    tenantId: ctx.tenantId,
    categories,
    navPages,
    products: [],
    featuredBlogPosts,
    assets,
  };

  return (
    <>
      <main>
        <BlockRenderer nodes={blocks} dataContext={dataContext} />
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: organizationJsonLd(site, ctx.host),
        }}
      />
    </>
  );
}
