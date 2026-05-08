import { getTenantContext } from "@/lib/tenant";
import {
  getSiteWithProfile,
  getProduct,
  getProducts,
  getCategories,
  getNavPages,
  getSiteLayout,
} from "@/lib/api";
import { notFound } from "next/navigation";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
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
      getSiteWithProfile(ctx.host, ctx.tenantId, ctx.tenantSlug),
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

  const [
    site,
    product,
    categories,
    navPages,
    headerLayout,
    pageLayout,
    footerLayout,
  ] = await Promise.all([
    getSiteWithProfile(ctx.host, ctx.tenantId, ctx.tenantSlug),
    getProduct(ctx.host, ctx.tenantId, id),
    getCategories(ctx.host, ctx.tenantId),
    getNavPages(ctx.host, ctx.tenantId),
    getSiteLayout(ctx.host, ctx.tenantId, "header").catch(() => null),
    getSiteLayout(ctx.host, ctx.tenantId, "product-detail").catch(() => null),
    getSiteLayout(ctx.host, ctx.tenantId, "footer").catch(() => null),
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
      <main id="main-content">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <BlockRenderer nodes={blocks} dataContext={dataContext} />
        </div>
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
    </>
  );
}
