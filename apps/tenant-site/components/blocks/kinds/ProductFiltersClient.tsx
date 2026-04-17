"use client";

/**
 * Interactive filter sidebar. Reads the current URL search params,
 * renders collapsible accordion sections, and pushes updates via
 * `router.push` so the server re-renders with the new filter scope.
 *
 * Every mutation drops the `page` param — changing a filter on page
 * 3 should land the visitor back on page 1 of the new result set.
 */

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import type {
  PublicCategory,
  PublicProductBrandFacet,
  PublicProductFacetAttribute,
} from "@/lib/api";

type Props = {
  heading: string;
  stickyOffset: number;
  showCategory: boolean;
  showPriceRange: boolean;
  showBrand: boolean;
  categories: PublicCategory[];
  brands: PublicProductBrandFacet[];
  priceMin: string | null;
  priceMax: string | null;
  attributes: PublicProductFacetAttribute[];
};

export function ProductFiltersClient({
  heading,
  stickyOffset,
  showCategory,
  showPriceRange,
  showBrand,
  categories,
  brands,
  priceMin,
  priceMax,
  attributes,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
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

  const clearAll = useCallback(() => {
    // Keep sort/search since those aren't filters; wipe everything
    // else so Category / Price / Brand / attr[...] all reset at once.
    const keep = new Set(["sort", "search"]);
    const next = new URLSearchParams();
    searchParams.forEach((v, k) => {
      if (keep.has(k) && typeof v === "string") next.set(k, v);
    });
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname, searchParams]);

  const currentCategory = searchParams.get("categoryId") ?? "";
  const currentVendor = searchParams.get("vendorId") ?? "";
  const currentMin = searchParams.get("minPrice") ?? "";
  const currentMax = searchParams.get("maxPrice") ?? "";

  // Active attr filters: read every key shaped `attr[<typeId>]` and
  // collapse into a plain map for easy lookup in each chip.
  const activeAttr = useMemo(() => {
    const out: Record<string, string> = {};
    searchParams.forEach((v, k) => {
      const m = k.match(/^attr\[(.+)\]$/);
      if (m && m[1] && typeof v === "string") out[m[1]] = v;
    });
    return out;
  }, [searchParams]);

  const hasAnyFilter =
    currentCategory !== "" ||
    currentVendor !== "" ||
    currentMin !== "" ||
    currentMax !== "" ||
    Object.keys(activeAttr).length > 0;

  return (
    <aside
      style={{
        position: stickyOffset > 0 ? "sticky" : "static",
        top: stickyOffset,
        alignSelf: "start",
        padding: "1rem 0",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: "0.5rem",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <span
          style={{
            fontSize: "0.72rem",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "var(--color-muted)",
            fontWeight: 600,
          }}
        >
          {heading}
        </span>
        {hasAnyFilter && (
          <button
            type="button"
            onClick={clearAll}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-primary)",
              fontSize: "0.78rem",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Clear all
          </button>
        )}
      </div>

      {showCategory && categories.length > 0 && (
        <FilterGroup label="Category">
          <FacetList
            options={[
              { id: "", label: "All", count: null },
              ...categories.map((c) => ({
                id: c.id,
                label: c.name,
                count: null as number | null,
              })),
            ]}
            selected={currentCategory}
            onChange={(v) => setParam("categoryId", v || null)}
          />
        </FilterGroup>
      )}

      {showPriceRange && (
        <FilterGroup label="Price">
          <PriceFields
            minPlaceholder={priceMin ?? "Min"}
            maxPlaceholder={priceMax ?? "Max"}
            currentMin={currentMin}
            currentMax={currentMax}
            onApplyMin={(v) => setParam("minPrice", v || null)}
            onApplyMax={(v) => setParam("maxPrice", v || null)}
          />
        </FilterGroup>
      )}

      {showBrand && brands.length > 0 && (
        <FilterGroup label="Brand">
          <FacetList
            options={[
              { id: "", label: "All", count: null as number | null },
              ...brands.map((b) => ({
                id: b.id,
                label: b.name,
                count: b.count as number | null,
              })),
            ]}
            selected={currentVendor}
            onChange={(v) => setParam("vendorId", v || null)}
          />
        </FilterGroup>
      )}

      {attributes.map((attr) => (
        <FilterGroup key={attr.typeId} label={attr.typeName}>
          <FacetList
            options={[
              { id: "", label: "All", count: null as number | null },
              ...attr.values.map((v) => ({
                id: v.valueId,
                label: v.value,
                count: v.count as number | null,
              })),
            ]}
            selected={activeAttr[attr.typeId] ?? ""}
            onChange={(v) => setParam(`attr[${attr.typeId}]`, v || null)}
          />
        </FilterGroup>
      ))}
    </aside>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.35rem 0",
          background: "transparent",
          border: "none",
          color: "var(--color-text)",
          fontSize: "0.82rem",
          fontWeight: 600,
          letterSpacing: "0.04em",
          cursor: "pointer",
        }}
      >
        <span>{label}</span>
        <span
          aria-hidden
          style={{
            fontSize: "0.75rem",
            color: "var(--color-muted)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s ease",
          }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div style={{ marginTop: "0.5rem", display: "grid", gap: "0.4rem" }}>
          {children}
        </div>
      )}
    </div>
  );
}

function FacetList({
  options,
  selected,
  onChange,
}: {
  options: { id: string; label: string; count: number | null }[];
  selected: string;
  onChange: (id: string) => void;
}) {
  return (
    <div style={{ display: "grid", gap: "0.25rem" }}>
      {options.map((o) => {
        const isSelected = o.id === selected;
        return (
          <button
            key={o.id || "__all__"}
            type="button"
            onClick={() => onChange(o.id)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.5rem",
              width: "100%",
              padding: "0.35rem 0.5rem",
              textAlign: "left",
              borderRadius: "var(--radius)",
              border: "1px solid transparent",
              background: isSelected ? "var(--color-surface)" : "transparent",
              color: isSelected ? "var(--color-text)" : "var(--color-muted)",
              fontSize: "0.85rem",
              cursor: "pointer",
              fontWeight: isSelected ? 600 : 400,
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {o.label}
            </span>
            {o.count != null && (
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "var(--color-muted)",
                }}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function PriceFields({
  minPlaceholder,
  maxPlaceholder,
  currentMin,
  currentMax,
  onApplyMin,
  onApplyMax,
}: {
  minPlaceholder: string;
  maxPlaceholder: string;
  currentMin: string;
  currentMax: string;
  onApplyMin: (v: string) => void;
  onApplyMax: (v: string) => void;
}) {
  const [min, setMin] = useState(currentMin);
  const [max, setMax] = useState(currentMax);

  const handleKey = (
    e: React.KeyboardEvent<HTMLInputElement>,
    apply: () => void,
  ) => {
    if (e.key === "Enter") apply();
  };

  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <input
        type="number"
        min={0}
        placeholder={`Min (${formatAbbrev(minPlaceholder)})`}
        value={min}
        onChange={(e) => setMin(e.target.value)}
        onBlur={() => onApplyMin(min)}
        onKeyDown={(e) => handleKey(e, () => onApplyMin(min))}
        style={inputStyle}
      />
      <span style={{ color: "var(--color-muted)" }}>–</span>
      <input
        type="number"
        min={0}
        placeholder={`Max (${formatAbbrev(maxPlaceholder)})`}
        value={max}
        onChange={(e) => setMax(e.target.value)}
        onBlur={() => onApplyMax(max)}
        onKeyDown={(e) => handleKey(e, () => onApplyMax(max))}
        style={inputStyle}
      />
    </div>
  );
}

function formatAbbrev(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(Math.round(n));
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: "0.45rem 0.6rem",
  borderRadius: "var(--radius)",
  border: "1px solid var(--color-border)",
  background: "var(--color-background)",
  color: "var(--color-text)",
  fontSize: "0.85rem",
  fontFamily: "inherit",
};
