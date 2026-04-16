import { getTenantContext } from "@/lib/tenant";
import {
  getSite,
  getProducts,
  getCategories,
  getNavPages,
  getSiteLayout,
  getFeaturedBlogPosts,
  type ProductSort,
} from "@/lib/api";
import { pickTemplate } from "@/components/templates/pickTemplate";
import { readSections } from "@/lib/sections";
import { notFound } from "next/navigation";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { SiteHeader, SiteFooter } from "@/components/templates/shared";
import type { BlockDataContext } from "@/components/blocks/data-context";
import type { BlockNode } from "@repo/shared";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    categoryId?: string;
    sort?: string;
    search?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
}

const VALID_SORTS = new Set<ProductSort>([
  "newest",
  "price-asc",
  "price-desc",
  "name-asc",
]);

function parseSort(raw: string | undefined): ProductSort | undefined {
  if (!raw) return undefined;
  return VALID_SORTS.has(raw as ProductSort) ? (raw as ProductSort) : undefined;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const sort = parseSort(params.sort);

  const ctx = await getTenantContext();
  const [site, productList, categories, navPages, layout] = await Promise.all([
    getSite(ctx.host, ctx.tenantId),
    getProducts(ctx.host, ctx.tenantId, {
      page,
      limit: 24,
      categoryId: params.categoryId,
      sort,
      search: params.search,
      minPrice: params.minPrice ? Number(params.minPrice) : undefined,
      maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
    }),
    getCategories(ctx.host, ctx.tenantId),
    getNavPages(ctx.host, ctx.tenantId),
    getSiteLayout(ctx.host, ctx.tenantId, "products-index").catch(() => null),
  ]);

  if (!site) notFound();

  // Block-first: if there's a "products-index" SiteLayout, compose it via
  // BlockRenderer. The product-listing block reads pagination/sort state
  // from dataContext.searchParams and dataContext.productsPage/Total.
  if (layout && Array.isArray(layout.blocks) && layout.blocks.length > 0) {
    const dataContext: BlockDataContext = {
      site,
      host: ctx.host,
      tenantId: ctx.tenantId,
      categories,
      navPages,
      products: productList?.products ?? [],
      featuredBlogPosts: [],
      productsPage: productList?.page,
      productsTotal: productList?.total,
      searchParams: params,
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

  // featuredBlogPosts needed by the legacy template signature for `home`,
  // but the products page doesn't use them — pass an empty array.
  const featuredBlogPosts = await getFeaturedBlogPosts(
    ctx.host,
    ctx.tenantId,
    0,
  ).catch(() => []);

  const TemplateLayout = pickTemplate(site.template?.slug ?? null);
  return (
    <TemplateLayout
      page="products"
      site={site}
      products={productList?.products ?? []}
      categories={categories}
      featuredBlogPosts={featuredBlogPosts}
      navPages={navPages}
      sections={readSections(site.features)}
      pagination={
        productList
          ? {
              page: productList.page,
              total: productList.total,
              limit: productList.limit,
            }
          : undefined
      }
    />
  );
}
