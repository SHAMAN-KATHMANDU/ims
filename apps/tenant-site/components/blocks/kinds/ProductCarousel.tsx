"use client";

/**
 * Horizontally scrolling product row with snap + prev/next buttons.
 * Each item is ~260–320px wide; scroll-snap-x keeps items aligned as
 * the viewport flings. Prev/next buttons scroll by one viewport width
 * minus a small overlap so the next card peeks in before it snaps.
 *
 * Kept minimal on purpose — the cards themselves are the shared
 * `ProductCard` so every renderer stays visually consistent.
 */

import { useCallback, useRef } from "react";
import { ProductCard } from "@/components/templates/shared";
import type { PublicProduct } from "@/lib/api";

type Props = {
  products: PublicProduct[];
  cardVariant?: "bordered" | "bare" | "card";
  showCategory?: boolean;
  showPrice?: boolean;
  showDiscount?: boolean;
  cardAspectRatio?: "1/1" | "3/4" | "4/5" | "16/9";
};

export function ProductCarousel({
  products,
  cardVariant = "bordered",
  showCategory,
  showPrice,
  showDiscount,
  cardAspectRatio,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollBy = useCallback((dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    // Scroll by ~90% of the viewport so the next card peeks in before
    // the snap lands. Feels smoother than a full-width jump.
    const delta = Math.max(200, el.clientWidth * 0.9) * dir;
    el.scrollBy({ left: delta, behavior: "smooth" });
  }, []);

  if (products.length === 0) {
    return (
      <div
        style={{
          padding: "3rem 1rem",
          textAlign: "center",
          color: "var(--color-muted)",
        }}
      >
        No products to show yet.
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scrollBy(-1)}
        style={{ ...navBtn, left: 0 }}
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scrollBy(1)}
        style={{ ...navBtn, right: 0 }}
      >
        ›
      </button>
      <div
        ref={trackRef}
        style={{
          display: "flex",
          gap: "1.25rem",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          scrollPadding: "0 1rem",
          paddingBottom: "0.5rem",
          // Hide the scrollbar track on modern engines; keeps the row
          // looking like a carousel rather than a scroll area.
          scrollbarWidth: "none",
        }}
      >
        {products.map((p) => (
          <div
            key={p.id}
            style={{
              flex: "0 0 auto",
              width: "clamp(240px, 28vw, 320px)",
              scrollSnapAlign: "start",
            }}
          >
            <ProductCard
              product={p}
              variant={cardVariant}
              showCategory={showCategory}
              showPrice={showPrice}
              showDiscount={showDiscount}
              {...(cardAspectRatio ? { aspectRatio: cardAspectRatio } : {})}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  zIndex: 2,
  width: 40,
  height: 40,
  borderRadius: "999px",
  border: "1px solid var(--color-border)",
  background: "var(--color-background)",
  color: "var(--color-text)",
  fontSize: "1.5rem",
  cursor: "pointer",
  lineHeight: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
};
