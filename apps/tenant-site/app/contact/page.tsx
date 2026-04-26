import type { Metadata } from "next";
import { getTenantContext } from "@/lib/tenant";
import {
  getSiteWithProfile,
  getCategories,
  getNavPages,
  getSiteLayout,
} from "@/lib/api";
import { pickTemplate } from "@/components/templates/pickTemplate";
import { readSections } from "@/lib/sections";
import { notFound } from "next/navigation";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { SiteHeader, SiteFooter } from "@/components/templates/shared";
import type { BlockDataContext } from "@/components/blocks/data-context";
import type { BlockNode } from "@repo/shared";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with us.",
};

export default async function ContactPage() {
  const ctx = await getTenantContext();
  const [site, categories, navPages, layout] = await Promise.all([
    getSiteWithProfile(ctx.host, ctx.tenantId, ctx.tenantSlug),
    getCategories(ctx.host, ctx.tenantId),
    getNavPages(ctx.host, ctx.tenantId),
    getSiteLayout(ctx.host, ctx.tenantId, "contact").catch(() => null),
  ]);

  if (!site) notFound();

  if (layout && Array.isArray(layout.blocks) && layout.blocks.length > 0) {
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
      <>
        <SiteHeader
          site={site}
          host={ctx.host}
          categories={categories}
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

  const TemplateLayout = pickTemplate(site.template?.slug ?? null);
  return (
    <TemplateLayout
      page="contact"
      site={site}
      products={[]}
      categories={categories}
      navPages={navPages}
      sections={readSections(site.features)}
    />
  );
}
