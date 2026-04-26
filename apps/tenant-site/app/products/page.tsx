import { getTenantContext } from "@/lib/tenant";
import {
  getSiteWithProfile,
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
import { brandingDisplayName } from "@/lib/theme";
import type { BlockDataContext } from "@/components/blocks/data-context";
import type { BlockNode } from "@repo/shared";
import type { Metadata } from "next";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const ctx = await getTenantContext();
    const site = await getSiteWithProfile(
      ctx.host,
      ctx.tenantId,
      ctx.tenantSlug,
    );
    if (!site) return { title: "Products" };
    const name = brandingDisplayName(site.branding ?? null, ctx.host);
    return {
      title: `Products · ${name}`,
      description: `Browse products at ${name}.`,
    };
  } catch {
    return { title: "Products" };
  }
}

/**
 * Extract the attribute filter (type → value) from Next.js's flat
 * searchParams by matching the `attr[<typeId>]` key shape. Next doesn't
 * parse bracket notation into a nested object — we do it ourselves so
 * the URL still matches the Express qs-parsed shape the API expects.
 */
function parseAttrFilter(
  params: Record<string, string | string[] | undefined>,
): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    const m = key.match(/^attr\[(.+)\]$/);
    if (!m) continue;
    const typeId = m[1];
    if (!typeId) continue;
    const v = Array.isArray(value) ? value[0] : value;
    if (typeof v === "string" && v.length > 0) out[typeId] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function getOne(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
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
  const page = Number(getOne(params.page) ?? "1") || 1;
  const sort = parseSort(getOne(params.sort));
  const categoryId = getOne(params.categoryId);
  const search = getOne(params.search);
  const rawMinPrice = getOne(params.minPrice);
  const rawMaxPrice = getOne(params.maxPrice);
  const vendorId = getOne(params.vendorId);
  const attr = parseAttrFilter(params);

  const ctx = await getTenantContext();
  const [site, productList, categories, navPages, layout] = await Promise.all([
    getSiteWithProfile(ctx.host, ctx.tenantId, ctx.tenantSlug),
    getProducts(ctx.host, ctx.tenantId, {
      page,
      limit: 24,
      categoryId,
      sort,
      search,
      minPrice: rawMinPrice ? Number(rawMinPrice) : undefined,
      maxPrice: rawMaxPrice ? Number(rawMaxPrice) : undefined,
      vendorId,
      attr,
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
      productFacets: productList?.facets,
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
