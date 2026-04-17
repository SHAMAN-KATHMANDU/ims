"use client";

/**
 * PdpBuyboxClient — the interactive half of the PDP buybox.
 *
 * Hosts the price block, variant picker (chips grouped by attribute
 * type, or a single dropdown), quantity stepper, add-to-cart button,
 * and a sticky mobile bar that slides in when the main buybox scrolls
 * off-screen.
 *
 * When the product has a single variation (or no variations), the
 * picker collapses silently — the selected variation defaults to that
 * one row and price/SKU stay static.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import type {
  PublicProductVariation,
  PublicProductSubVariation,
} from "@/lib/api";

export type VariantDisplay = "chips" | "dropdown";

export interface PdpBuyboxClientProps {
  productId: string;
  productName: string;
  /** Base price used when there are no variations (or as a fallback). */
  baseUnitPrice: number;
  baseMrp: number;
  imageUrl: string | null;
  baseSku: string;
  variations: PublicProductVariation[];
  showSku: boolean;
  showVariantPicker: boolean;
  variantDisplay: VariantDisplay;
  priceSize: "sm" | "md" | "lg";
}

function priceFontSize(size: "sm" | "md" | "lg"): string {
  if (size === "sm") return "1.1rem";
  if (size === "lg") return "1.65rem";
  return "1.35rem";
}

/** Group attributes by typeId so the picker renders one row per type. */
function groupByType(variations: PublicProductVariation[]): {
  typeId: string;
  typeName: string;
  values: { valueId: string; value: string }[];
}[] {
  const types: {
    typeId: string;
    typeName: string;
    values: Map<string, string>;
  }[] = [];
  for (const v of variations) {
    for (const a of v.attributes) {
      let entry = types.find((t) => t.typeId === a.typeId);
      if (!entry) {
        entry = { typeId: a.typeId, typeName: a.typeName, values: new Map() };
        types.push(entry);
      }
      if (!entry.values.has(a.valueId)) entry.values.set(a.valueId, a.value);
    }
  }
  return types.map((t) => ({
    typeId: t.typeId,
    typeName: t.typeName,
    values: Array.from(t.values.entries()).map(([valueId, value]) => ({
      valueId,
      value,
    })),
  }));
}

/**
 * Resolve a variation from a (typeId → valueId) partial selection.
 * Returns the first variation whose attributes satisfy every selected
 * typeId/valueId pair, or null when nothing matches.
 */
function matchVariation(
  variations: PublicProductVariation[],
  selected: Record<string, string>,
): PublicProductVariation | null {
  for (const v of variations) {
    const attrsByType = Object.fromEntries(
      v.attributes.map((a) => [a.typeId, a.valueId]),
    );
    const ok = Object.entries(selected).every(
      ([typeId, valueId]) => attrsByType[typeId] === valueId,
    );
    if (ok) return v;
  }
  return null;
}

export function PdpBuyboxClient({
  productId,
  productName,
  baseUnitPrice,
  baseMrp,
  imageUrl,
  baseSku,
  variations,
  showSku,
  showVariantPicker,
  variantDisplay,
  priceSize,
}: PdpBuyboxClientProps) {
  const [qty, setQty] = useState(1);
  const buyboxRef = useRef<HTMLDivElement>(null);
  const [offScreen, setOffScreen] = useState(false);

  // Default to the first variation (matches the server's canonical
  // "first active variation" choice) or no selection when absent.
  const firstVariation = variations[0];
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    if (!firstVariation) return {};
    return Object.fromEntries(
      firstVariation.attributes.map((a) => [a.typeId, a.valueId]),
    );
  });

  const attributeGroups = useMemo(() => groupByType(variations), [variations]);
  const canShowPicker =
    showVariantPicker && variations.length > 1 && attributeGroups.length > 0;

  const activeVariation: PublicProductVariation | null = useMemo(() => {
    if (variations.length === 0) return null;
    if (variations.length === 1) return firstVariation!;
    return matchVariation(variations, selected);
  }, [variations, selected, firstVariation]);

  // Sub-variation selector (e.g. bundle quantity) only shows when the
  // chosen variation actually has sub-variations.
  const [subVariationId, setSubVariationId] = useState<string | null>(null);
  useEffect(() => {
    const subs = activeVariation?.subVariations ?? [];
    if (subs.length === 0) {
      setSubVariationId(null);
      return;
    }
    // Keep the current pick if it's still valid; else default to first.
    setSubVariationId((prev) =>
      prev && subs.some((s) => s.id === prev) ? prev : (subs[0]?.id ?? null),
    );
  }, [activeVariation]);

  useEffect(() => {
    const el = buyboxRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setOffScreen(!entry!.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const unitPrice = activeVariation
    ? Number(activeVariation.finalSp)
    : baseUnitPrice;
  const mrp = activeVariation ? Number(activeVariation.mrp) : baseMrp;
  const hasDiscount = mrp > 0 && unitPrice < mrp;
  const sku = activeVariation?.sku ?? baseSku;
  const stockWarning =
    activeVariation && activeVariation.stockQuantity <= 0
      ? "Out of stock"
      : activeVariation && activeVariation.stockQuantity <= 3
        ? `Only ${activeVariation.stockQuantity} left`
        : null;

  const variationLabel = activeVariation
    ? activeVariation.attributes.map((a) => a.value).join(" / ")
    : null;
  const subLabel =
    subVariationId && activeVariation
      ? (activeVariation.subVariations.find((s) => s.id === subVariationId)
          ?.name ?? null)
      : null;
  const fullLabel = [variationLabel, subLabel].filter(Boolean).join(" · ");

  return (
    <>
      <div
        ref={buyboxRef}
        style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "0.75rem",
            fontSize: priceFontSize(priceSize),
          }}
        >
          <span style={{ fontWeight: 700 }}>
            ₹{unitPrice.toLocaleString("en-IN")}
          </span>
          {hasDiscount && (
            <span
              style={{
                textDecoration: "line-through",
                color: "var(--color-muted)",
                fontSize: "1rem",
              }}
            >
              ₹{mrp.toLocaleString("en-IN")}
            </span>
          )}
          {stockWarning && (
            <span
              role="status"
              aria-live="polite"
              style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                color:
                  activeVariation?.stockQuantity === 0
                    ? "var(--color-error)"
                    : "var(--color-warning)",
              }}
            >
              {stockWarning}
            </span>
          )}
        </div>

        {showSku && (
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--color-muted)",
              fontFamily: "var(--font-heading)",
              letterSpacing: "0.04em",
            }}
          >
            SKU: {sku}
          </div>
        )}

        {canShowPicker && variantDisplay === "chips" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {attributeGroups.map((group) => {
              const groupLabelId = `variant-group-${group.typeId}`;
              return (
                <div key={group.typeId}>
                  <div
                    id={groupLabelId}
                    style={{
                      fontSize: "0.72rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "var(--color-muted)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {group.typeName}
                  </div>
                  <div
                    role="radiogroup"
                    aria-labelledby={groupLabelId}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    {group.values.map((v) => {
                      const isActive = selected[group.typeId] === v.valueId;
                      return (
                        <button
                          key={v.valueId}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          aria-label={`${group.typeName}: ${v.value}`}
                          onClick={() =>
                            setSelected((prev) => ({
                              ...prev,
                              [group.typeId]: v.valueId,
                            }))
                          }
                          style={{
                            padding: "0.6rem 0.9rem",
                            minHeight: 44,
                            border: `1px solid ${
                              isActive
                                ? "var(--color-text)"
                                : "var(--color-border)"
                            }`,
                            background: isActive
                              ? "var(--color-text)"
                              : "transparent",
                            color: isActive
                              ? "var(--color-background)"
                              : "var(--color-text)",
                            borderRadius: "var(--radius)",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            letterSpacing: "0.02em",
                          }}
                        >
                          {v.value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {canShowPicker && variantDisplay === "dropdown" && (
          <label
            style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}
          >
            <span
              style={{
                fontSize: "0.72rem",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--color-muted)",
              }}
            >
              Variant
            </span>
            <select
              value={activeVariation?.id ?? ""}
              onChange={(e) => {
                const v = variations.find((x) => x.id === e.target.value);
                if (!v) return;
                setSelected(
                  Object.fromEntries(
                    v.attributes.map((a) => [a.typeId, a.valueId]),
                  ),
                );
              }}
              style={{
                padding: "0.55rem 0.75rem",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius)",
                background: "var(--color-background)",
                color: "var(--color-text)",
              }}
            >
              {variations.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.attributes.map((a) => a.value).join(" / ") || v.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {activeVariation && activeVariation.subVariations.length > 0 && (
          <SubVariationPicker
            items={activeVariation.subVariations}
            selectedId={subVariationId}
            onChange={setSubVariationId}
          />
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius)",
            }}
          >
            <button
              type="button"
              aria-label="Decrease quantity"
              disabled={qty <= 1}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              style={{
                padding: "0.5rem 0.75rem",
                minWidth: 44,
                minHeight: 44,
                background: "none",
                border: "none",
                cursor: qty <= 1 ? "not-allowed" : "pointer",
                opacity: qty <= 1 ? 0.5 : 1,
                fontSize: "1rem",
              }}
            >
              −
            </button>
            <span
              aria-live="polite"
              aria-atomic="true"
              aria-label={`Quantity ${qty}`}
              style={{
                minWidth: "2.5rem",
                textAlign: "center",
                fontSize: "0.95rem",
                fontWeight: 500,
              }}
            >
              {qty}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              disabled={qty >= 99}
              onClick={() => setQty((q) => Math.min(99, q + 1))}
              style={{
                padding: "0.5rem 0.75rem",
                minWidth: 44,
                minHeight: 44,
                background: "none",
                border: "none",
                cursor: qty >= 99 ? "not-allowed" : "pointer",
                opacity: qty >= 99 ? 0.5 : 1,
                fontSize: "1rem",
              }}
            >
              +
            </button>
          </div>
          <AddToCartButton
            productId={productId}
            productName={productName}
            unitPrice={unitPrice}
            imageUrl={imageUrl}
            quantity={qty}
            variationId={activeVariation?.id ?? null}
            subVariationId={subVariationId}
            variationLabel={fullLabel || null}
            disabled={!!activeVariation && activeVariation.stockQuantity <= 0}
          />
        </div>
      </div>

      {offScreen && (
        <div
          className="tpl-mobile-only"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "0.75rem 1rem",
            background: "var(--color-background)",
            borderTop: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            zIndex: 40,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontWeight: 500,
                fontSize: "0.9rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {productName}
              {fullLabel && (
                <span style={{ color: "var(--color-muted)" }}>
                  {" "}
                  — {fullLabel}
                </span>
              )}
            </div>
            <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
              ₹{unitPrice.toLocaleString("en-IN")}
            </div>
          </div>
          <AddToCartButton
            productId={productId}
            productName={productName}
            unitPrice={unitPrice}
            imageUrl={imageUrl}
            quantity={1}
            variationId={activeVariation?.id ?? null}
            subVariationId={subVariationId}
            variationLabel={fullLabel || null}
            disabled={!!activeVariation && activeVariation.stockQuantity <= 0}
          />
        </div>
      )}
    </>
  );
}

function SubVariationPicker({
  items,
  selectedId,
  onChange,
}: {
  items: PublicProductSubVariation[];
  selectedId: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div>
      <div
        id="subvariant-group-label"
        style={{
          fontSize: "0.72rem",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--color-muted)",
          marginBottom: "0.5rem",
        }}
      >
        Option
      </div>
      <div
        role="radiogroup"
        aria-labelledby="subvariant-group-label"
        style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
      >
        {items.map((s) => {
          const isActive = s.id === selectedId;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(s.id)}
              style={{
                padding: "0.6rem 0.9rem",
                minHeight: 44,
                border: `1px solid ${
                  isActive ? "var(--color-text)" : "var(--color-border)"
                }`,
                background: isActive ? "var(--color-text)" : "transparent",
                color: isActive
                  ? "var(--color-background)"
                  : "var(--color-text)",
                borderRadius: "var(--radius)",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              {s.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
