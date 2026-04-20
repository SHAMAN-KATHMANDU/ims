/**
 * product-listing block — the main products-index composition.
 *
 * Server-rendered grid (uses the products already fetched by the route) +
 * client-rendered filter/sort controls that update the URL via a small
 * navigation shim. The block reads current state from `dataContext.search
 * Params` so the server can render the correct slice; the client controls
 * push new URLs which re-trigger the server render.
 *
 * This is deliberately simple in Phase 5: one sort dropdown + an optional
 * category select. Facet sidebars, price range sliders, and predictive
 * search are Phase 5.1+.
 */

import Link from "next/link";
import type { ProductListingProps } from "@repo/shared";
import { SearchBar } from "@/components/search/SearchBar";
import { ProductGrid } from "@/components/templates/shared";
import type { BlockComponentProps } from "../registry";
import type { ProductSort } from "@/lib/api";
import { getSiteFormatOptions } from "@/lib/format";
import { ProductListingControls } from "./ProductListingControls";

const SORT_LABELS: Record<ProductSort, string> = {
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  "name-asc": "Name: A–Z",
};

export function ProductListingBlock({
  node,
  props,
  dataContext,
}: BlockComponentProps<ProductListingProps>) {
  const params = dataContext.searchParams ?? {};
  const rawSort = typeof params.sort === "string" ? params.sort : undefined;
  const currentSort: ProductSort =
    rawSort && rawSort in SORT_LABELS
      ? (rawSort as ProductSort)
      : props.defaultSort;
  const currentCategory =
    typeof params.categoryId === "string" ? params.categoryId : "";
  const rawPage = typeof params.page === "string" ? Number(params.page) : 1;
  const currentPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const total = dataContext.productsTotal ?? dataContext.products.length;
  const totalPages = Math.max(1, Math.ceil(total / props.pageSize));
  const wrapperHasPadY = node.style?.paddingY !== undefined;
  const formatOpts = getSiteFormatOptions(dataContext.site);

  return (
    <section
      style={{
        padding: wrapperHasPadY ? undefined : "var(--section-padding) 0",
      }}
    >
      <div className="container">
        {(props.showSort || props.categoryFilter) && (
          <ProductListingControls
            showSort={props.showSort}
            showCategoryFilter={props.categoryFilter}
            currentSort={currentSort}
            currentCategory={currentCategory}
            categories={dataContext.categories}
            sortOptions={SORT_LABELS}
          />
        )}
        {total > 0 && (
          <div
            style={{
              fontSize: "0.82rem",
              color: "var(--color-muted)",
              marginBottom: "1.25rem",
            }}
          >
            Showing {dataContext.products.length} of {total} products
          </div>
        )}
        {dataContext.products.length > 0 ? (
          <ProductGrid
            products={dataContext.products}
            columns={props.columns}
            variant="bordered"
            showCategory={props.showCategory}
            showPrice={props.showPrice}
            showDiscount={props.showDiscount}
            cardAspectRatio={props.cardAspectRatio}
            formatOpts={formatOpts}
          />
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "4rem 1rem",
              color: "var(--color-muted)",
            }}
          >
            <div
              style={{
                fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                color: "var(--color-text)",
                marginBottom: "0.75rem",
              }}
            >
              No products found
            </div>
            {typeof params.search === "string" && params.search && (
              <p style={{ marginBottom: "1.5rem" }}>
                No results for &ldquo;{params.search}&rdquo;. Try a different
                search term.
              </p>
            )}
            <Link
              href="/products"
              style={{
                color: "var(--color-primary)",
                textDecoration: "underline",
                fontWeight: 500,
              }}
            >
              Clear all filters
            </Link>
          </div>
        )}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            baseParams={params}
          />
        )}
      </div>
    </section>
  );
}

function Pagination({
  currentPage,
  totalPages,
  baseParams,
}: {
  currentPage: number;
  totalPages: number;
  baseParams: Record<string, string | string[] | undefined>;
}) {
  const hrefFor = (page: number): string => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(baseParams)) {
      if (Array.isArray(v)) {
        if (v[0]) params.set(k, v[0]);
      } else if (typeof v === "string") {
        params.set(k, v);
      }
    }
    if (page === 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    const qs = params.toString();
    return qs ? `/products?${qs}` : "/products";
  };

  // Show up to 7 page links centered on the current page.
  const windowSize = 7;
  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, currentPage - half);
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);

  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav
      aria-label="Pagination"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "0.4rem",
        marginTop: "3rem",
      }}
    >
      <PagerLink
        href={hrefFor(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        label="Prev"
      />
      {pages.map((p) => (
        <Link
          key={p}
          href={hrefFor(p)}
          aria-current={p === currentPage ? "page" : undefined}
          style={{
            minWidth: 36,
            textAlign: "center",
            padding: "0.4rem 0.7rem",
            borderRadius: "var(--radius)",
            fontSize: "0.9rem",
            border: "1px solid var(--color-border)",
            background:
              p === currentPage ? "var(--color-primary)" : "transparent",
            color:
              p === currentPage
                ? "var(--color-on-primary, #fff)"
                : "var(--color-text)",
            textDecoration: "none",
          }}
        >
          {p}
        </Link>
      ))}
      <PagerLink
        href={hrefFor(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        label="Next"
      />
    </nav>
  );
}

function PagerLink({
  href,
  label,
  disabled,
}: {
  href: string;
  label: string;
  disabled: boolean;
}) {
  const style: React.CSSProperties = {
    padding: "0.4rem 0.9rem",
    borderRadius: "var(--radius)",
    border: "1px solid var(--color-border)",
    fontSize: "0.9rem",
    color: disabled ? "var(--color-muted)" : "var(--color-text)",
    background: "transparent",
    textDecoration: "none",
    pointerEvents: disabled ? "none" : "auto",
    opacity: disabled ? 0.6 : 1,
  };
  if (disabled) return <span style={style}>{label}</span>;
  return (
    <Link href={href} style={style}>
      {label}
    </Link>
  );
}
