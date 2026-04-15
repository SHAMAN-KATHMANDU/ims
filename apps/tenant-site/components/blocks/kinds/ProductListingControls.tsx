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
import { useCallback } from "react";
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

  return (
    <div
      style={{
        display: "flex",
        gap: "0.75rem",
        alignItems: "center",
        justifyContent: "flex-end",
        flexWrap: "wrap",
        marginBottom: "2rem",
      }}
    >
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
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "0.45rem 0.75rem",
  borderRadius: "var(--radius)",
  border: "1px solid var(--color-border)",
  background: "var(--color-background)",
  color: "var(--color-text)",
  fontSize: "0.85rem",
  fontFamily: "inherit",
};
