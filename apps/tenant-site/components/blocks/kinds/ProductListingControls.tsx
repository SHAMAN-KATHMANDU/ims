"use client";

/**
 * Client-rendered controls bar for the product-listing block.
 *
 * Sort dropdown + category select that push URL changes via the Next.js
 * router. Pagination stays server-rendered as <Link> so shares + crawlers
 * work without JS, but the filter UI needs client state because <select>
 * posts require either a form or JS.
 */

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import type { PublicCategory, ProductSort } from "@/lib/api";

type Props = {
  showSort: boolean;
  showCategoryFilter: boolean;
  currentSort: ProductSort;
  currentCategory: string;
  categories: PublicCategory[];
  sortOptions: Record<ProductSort, string>;
};

export function ProductListingControls({
  showSort,
  showCategoryFilter,
  currentSort,
  currentCategory,
  categories,
  sortOptions,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pushParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      // Any filter change resets to page 1.
      params.delete("page");
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams],
  );

  const [mobileOpen, setMobileOpen] = useState(false);

  const filterControls = (
    <>
      <PriceRangeFilter pushParam={pushParam} searchParams={searchParams} />
      {showCategoryFilter && categories.length > 0 && (
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.85rem",
            color: "var(--color-muted)",
          }}
        >
          Category
          <select
            value={currentCategory}
            onChange={(e) => pushParam("categoryId", e.target.value || null)}
            style={selectStyle}
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {showSort && (
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.85rem",
            color: "var(--color-muted)",
          }}
        >
          Sort by
          <select
            value={currentSort}
            onChange={(e) => pushParam("sort", e.target.value)}
            style={selectStyle}
          >
            {(Object.keys(sortOptions) as ProductSort[]).map((k) => (
              <option key={k} value={k}>
                {sortOptions[k]}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  );

  return (
    <>
      {/* Desktop controls */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
          justifyContent: "flex-end",
          flexWrap: "wrap",
          marginBottom: "2rem",
        }}
        className="tpl-desktop-only"
      >
        {filterControls}
      </div>

      {/* Mobile filter trigger */}
      <div
        className="tpl-mobile-only"
        style={{ display: "none", marginBottom: "1.5rem" }}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          style={{
            width: "100%",
            padding: "0.7rem 1rem",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
            background: "var(--color-surface)",
            color: "var(--color-text)",
            fontSize: "0.85rem",
            fontWeight: 500,
            fontFamily: "inherit",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            width={16}
            height={16}
          >
            <path
              d="M4 6h16M6 12h12M8 18h8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Filters &amp; Sort
        </button>
      </div>

      {/* Mobile filter drawer */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 49,
            }}
          />
          {/* Panel */}
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: "var(--color-background)",
              padding: "1.5rem",
              borderTop: "1px solid var(--color-border)",
              zIndex: 50,
              maxHeight: "70vh",
              overflowY: "auto",
              borderRadius: "1rem 1rem 0 0",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: "1.05rem" }}>
                Filters &amp; Sort
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1.25rem",
                  color: "var(--color-text)",
                }}
                aria-label="Close filters"
              >
                &times;
              </button>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {filterControls}
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="btn"
              style={{
                width: "100%",
                justifyContent: "center",
                marginTop: "0.5rem",
              }}
            >
              Apply
            </button>
          </div>
        </>
      )}
    </>
  );
}

function PriceRangeFilter({
  pushParam,
  searchParams,
}: {
  pushParam: (key: string, value: string | null) => void;
  searchParams: URLSearchParams;
}) {
  const [min, setMin] = useState(searchParams.get("minPrice") ?? "");
  const [max, setMax] = useState(searchParams.get("maxPrice") ?? "");

  const applyMin = () => pushParam("minPrice", min || null);
  const applyMax = () => pushParam("maxPrice", max || null);

  const handleKey = (e: React.KeyboardEvent, apply: () => void) => {
    if (e.key === "Enter") apply();
  };

  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        fontSize: "0.85rem",
        color: "var(--color-muted)",
      }}
    >
      Price range
      <input
        type="number"
        min={0}
        placeholder="Min"
        value={min}
        onChange={(e) => setMin(e.target.value)}
        onBlur={applyMin}
        onKeyDown={(e) => handleKey(e, applyMin)}
        style={{ ...inputStyle, width: "5.5rem" }}
      />
      <span style={{ color: "var(--color-muted)" }}>&ndash;</span>
      <input
        type="number"
        min={0}
        placeholder="Max"
        value={max}
        onChange={(e) => setMax(e.target.value)}
        onBlur={applyMax}
        onKeyDown={(e) => handleKey(e, applyMax)}
        style={{ ...inputStyle, width: "5.5rem" }}
      />
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "0.45rem 0.75rem",
  borderRadius: "var(--radius)",
  border: "1px solid var(--color-border)",
  background: "var(--color-background)",
  color: "var(--color-text)",
  fontSize: "0.85rem",
  fontFamily: "inherit",
};

const selectStyle: React.CSSProperties = {
  padding: "0.45rem 0.75rem",
  borderRadius: "var(--radius)",
  border: "1px solid var(--color-border)",
  background: "var(--color-background)",
  color: "var(--color-text)",
  fontSize: "0.85rem",
  fontFamily: "inherit",
};
