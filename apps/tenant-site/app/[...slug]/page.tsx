import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getSiteWithProfile,
  getCategories,
  getNavPages,
  getTenantPageBySlug,
  getSiteLayout,
  getProducts,
  getFeaturedBlogPosts,
  getActivePromos,
  type ProductSort,
} from "@/lib/api";
import { getTenantContext } from "@/lib/tenant";
import { MarkdownBody } from "@/components/blog/MarkdownBody";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import type { BlockNode } from "@repo/shared";
import type { BlockDataContext } from "@/components/blocks/data-context";

/**
 * Catch-all route for tenant-authored custom pages (About, FAQ,
 * Shipping, Lookbook, ...). Supports nested URLs via the page
 * hierarchy: /about renders slug="about", /about/team renders
 * slug="team" (the last segment is always the page slug; earlier
 * segments are validated as ancestors but the page is looked up by
 * the leaf slug alone — flat slugs are still unique per tenant).
 *
 * Layout variants (`default` / `full-width` / `narrow`) map to three
 * content-column widths so the tenant can pick a reading width per
 * page without touching CSS.
 */

type Props = {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function columnWidth(variant: string | undefined): number {
  if (variant === "full-width") return 1200;
  if (variant === "narrow") return 640;
  return 820;
}

function leafSlug(segments: string[]): string {
  return segments[segments.length - 1] ?? "";
}

function getOne(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = leafSlug((await params).slug);
  try {
    const ctx = await getTenantContext();
    const page = await getTenantPageBySlug(ctx.host, ctx.tenantId, slug);
    if (!page) return { title: "Page not found" };
    return {
      title: page.seoTitle || page.title,
      description: page.seoDescription || undefined,
    };
  } catch {
    return { title: "Page" };
  }
}

export default async function TenantCustomPage({
  params,
  searchParams,
}: Props) {
  const slug = leafSlug((await params).slug);
  if (!slug) notFound();

  const ctx = await getTenantContext();
  const params_resolved = await searchParams;
  const page = Number(getOne(params_resolved.page) ?? "1") || 1;
  const sort = parseSort(getOne(params_resolved.sort));
  const categoryId = getOne(params_resolved.categoryId);
  const search = getOne(params_resolved.search);
  const rawMinPrice = getOne(params_resolved.minPrice);
  const rawMaxPrice = getOne(params_resolved.maxPrice);
  const vendorId = getOne(params_resolved.vendorId);
  const attr = parseAttrFilter(params_resolved);

  const [site, pageRecord, categories, navPages] = await Promise.all([
    getSiteWithProfile(ctx.host, ctx.tenantId, ctx.tenantSlug),
    getTenantPageBySlug(ctx.host, ctx.tenantId, slug),
    getCategories(ctx.host, ctx.tenantId),
    getNavPages(ctx.host, ctx.tenantId),
  ]);

  if (!site || !pageRecord) notFound();

  const [
    headerLayout,
    pageLayout,
    footerLayout,
    productList,
    featuredBlogPosts,
    promos,
  ] = await Promise.all([
    getSiteLayout(ctx.host, ctx.tenantId, "header").catch(() => null),
    getSiteLayout(ctx.host, ctx.tenantId, "page", pageRecord.id).catch(
      () => null,
    ),
    getSiteLayout(ctx.host, ctx.tenantId, "footer").catch(() => null),
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
    getFeaturedBlogPosts(ctx.host, ctx.tenantId, 3),
    getActivePromos(ctx.host, ctx.tenantId),
  ]);

  const maxWidth = columnWidth(pageRecord.layoutVariant);

  // Phase 4+: if the tenant has a `page` SiteLayout, render it via the
  // block pipeline with optional header/footer chrome. Otherwise fall through
  // to the legacy markdown rendering.
  if (
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

    const blockDataContext: BlockDataContext = {
      site,
      host: ctx.host,
      tenantId: ctx.tenantId,
      categories,
      navPages,
      products: productList?.products ?? [],
      featuredBlogPosts: featuredBlogPosts ?? [],
      productsPage: productList?.page,
      productsTotal: productList?.total,
      searchParams: params_resolved,
      productFacets: productList?.facets,
      promos,
    };

    return (
      <>
        <main>
          <BlockRenderer nodes={blocks} dataContext={blockDataContext} />
        </main>
      </>
    );
  }

  return (
    <div data-page="tenant-custom">
      {/* Phase 8 — full-bleed cover spans the viewport above the page chrome. */}
      {pageRecord.coverImageUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={pageRecord.coverImageUrl}
          alt=""
          aria-hidden="true"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          sizes="100vw"
          style={{
            width: "100%",
            aspectRatio: "16 / 5",
            objectFit: "cover",
            display: "block",
          }}
        />
      )}
      <main
        className="container"
        style={{
          padding: "var(--section-padding) 0",
          maxWidth,
          margin: "0 auto",
        }}
      >
        <article>
          <h1
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontFamily: "var(--font-display)",
              lineHeight: 1.15,
              marginBottom: "2rem",
              color: "var(--color-text)",
              display: "flex",
              alignItems: "baseline",
              gap: "0.65rem",
            }}
          >
            {pageRecord.icon && (
              <span
                aria-hidden="true"
                style={{
                  fontSize: "2rem",
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                {pageRecord.icon}
              </span>
            )}
            <span>{pageRecord.title}</span>
          </h1>
          <MarkdownBody source={pageRecord.bodyMarkdown} />
        </article>
      </main>
    </div>
  );
}
