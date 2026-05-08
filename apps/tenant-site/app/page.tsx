import { getTenantContext } from "@/lib/tenant";
import {
  getSiteWithProfile,
  getProducts,
  getCategories,
  getFeaturedBlogPosts,
  getNavPages,
  getSiteLayout,
} from "@/lib/api";
import { pickTemplate } from "@/components/templates/pickTemplate";
import { readSections } from "@/lib/sections";
import { notFound } from "next/navigation";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import type { BlockDataContext } from "@/components/blocks/data-context";
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
  const [site, productList, categories, featuredBlogPosts, navPages, layout] =
    await Promise.all([
      getSiteWithProfile(ctx.host, ctx.tenantId, ctx.tenantSlug),
      getProducts(ctx.host, ctx.tenantId, { page: 1, limit: 50 }),
      getCategories(ctx.host, ctx.tenantId),
      getFeaturedBlogPosts(ctx.host, ctx.tenantId, 3),
      getNavPages(ctx.host, ctx.tenantId),
      getSiteLayout(ctx.host, ctx.tenantId, "home").catch(() => null),
    ]);

  if (!site) notFound();

  // Phase 3+: if the tenant has a `home` SiteLayout, render it via the
  // block pipeline. Otherwise fall through to the legacy pickTemplate path
  // so existing tenants keep working.
  if (layout && Array.isArray(layout.blocks) && layout.blocks.length > 0) {
    const dataContext: BlockDataContext = {
      site,
      host: ctx.host,
      tenantId: ctx.tenantId,
      categories,
      navPages,
      products: productList?.products ?? [],
      featuredBlogPosts,
    };
    return (
      <>
        <main>
          <BlockRenderer
            nodes={layout.blocks as BlockNode[]}
            dataContext={dataContext}
          />
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

  const TemplateLayout = pickTemplate(site.template?.slug ?? null);
  return (
    <>
      <TemplateLayout
        page="home"
        site={site}
        products={productList?.products ?? []}
        categories={categories}
        featuredBlogPosts={featuredBlogPosts}
        navPages={navPages}
        sections={readSections(site.features)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: organizationJsonLd(site, ctx.host),
        }}
      />
    </>
  );
}
