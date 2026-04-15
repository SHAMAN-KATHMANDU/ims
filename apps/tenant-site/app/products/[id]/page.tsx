import { getTenantContext } from "@/lib/tenant";
import {
  getSite,
  getProduct,
  getProducts,
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
import { productMetadata, productJsonLd } from "@/lib/seo";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    const ctx = await getTenantContext();
    const [site, product] = await Promise.all([
      getSite(ctx.host, ctx.tenantId),
      getProduct(ctx.host, ctx.tenantId, id),
    ]);
    if (!site || !product) return {};
    return productMetadata(product, site, ctx.host);
  } catch {
    return {};
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const ctx = await getTenantContext();

  const [site, product, categories, navPages, layout] = await Promise.all([
    getSite(ctx.host, ctx.tenantId),
    getProduct(ctx.host, ctx.tenantId, id),
    getCategories(ctx.host, ctx.tenantId),
    getNavPages(ctx.host, ctx.tenantId),
    getSiteLayout(ctx.host, ctx.tenantId, "product-detail").catch(() => null),
  ]);

  if (!site || !product) notFound();

  // Fetch a few products from the same category for the related-products
  // block. Best-effort — failure falls through to an empty array.
  const relatedList = product.category
    ? await getProducts(ctx.host, ctx.tenantId, {
        page: 1,
        limit: 8,
        categoryId: product.category.id,
      }).catch(() => null)
    : null;
  const relatedProducts =
    relatedList?.products.filter((p) => p.id !== product.id) ?? [];

  const jsonLd = productJsonLd(product, ctx.host);

  // Block-first rendering for PDP.
  if (layout && Array.isArray(layout.blocks) && layout.blocks.length > 0) {
    const dataContext: BlockDataContext = {
      site,
      host: ctx.host,
      tenantId: ctx.tenantId,
      categories,
      navPages,
      products: [product],
      featuredBlogPosts: [],
      activeProduct: product,
      relatedProducts,
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      </>
    );
  }

  const TemplateLayout = pickTemplate(site.template?.slug ?? null);
  return (
    <>
      <TemplateLayout
        page="product"
        site={site}
        products={[product]}
        categories={categories}
        navPages={navPages}
        sections={readSections(site.features)}
        activeProduct={product}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
    </>
  );
}
