/**
 * Commerce blocks — hero, product grid, category tiles.
 *
 * These thin wrappers translate BlockProps to the existing shared.tsx
 * primitives. We keep the primitives as the implementation of record so
 * the legacy pickTemplate rendering path and the new block path produce
 * the same visual output during Phase 8's migration window.
 */

import {
  Hero,
  ProductGrid,
  CategoryTiles,
  type HeroVariant,
} from "@/components/templates/shared";
import type {
  HeroProps,
  ProductGridProps,
  CategoryTilesProps,
} from "@repo/shared";
import type { PublicProduct } from "@/lib/api";
import type { BlockComponentProps } from "../registry";

export function HeroBlock({
  props,
  dataContext,
}: BlockComponentProps<HeroProps>) {
  return (
    <Hero
      site={dataContext.site}
      host={dataContext.host}
      variant={props.variant as HeroVariant}
      ctaHref={props.ctaHref ?? "/products"}
      ctaLabel={props.ctaLabel ?? "Shop the collection"}
      title={props.title}
      subtitle={props.subtitle}
      imageUrl={props.imageUrl}
      heroLayout={props.heroLayout}
    />
  );
}

function selectProducts(
  all: PublicProduct[],
  source: ProductGridProps["source"],
  opts: { categoryId?: string; productIds?: string[]; limit: number },
): PublicProduct[] {
  if (source === "manual" && opts.productIds && opts.productIds.length > 0) {
    const byId = new Map(all.map((p) => [p.id, p] as const));
    return opts.productIds
      .map((id) => byId.get(id))
      .filter((p): p is PublicProduct => !!p)
      .slice(0, opts.limit);
  }
  if (source === "category" && opts.categoryId) {
    return all
      .filter((p) => p.categoryId === opts.categoryId)
      .slice(0, opts.limit);
  }
  // "featured" — just take the first `limit` products from the current
  // page's data context (products are typically ordered newest-first by
  // the API).
  return all.slice(0, opts.limit);
}

export function ProductGridBlock({
  props,
  dataContext,
}: BlockComponentProps<ProductGridProps>) {
  const products = selectProducts(dataContext.products, props.source, {
    categoryId: props.categoryId,
    productIds: props.productIds,
    limit: props.limit,
  });
  return (
    <section style={{ padding: "var(--section-padding) 0" }}>
      <div className="container">
        {(props.eyebrow || props.heading) && (
          <div
            style={{
              marginBottom: "2.5rem",
              textAlign: "center",
            }}
          >
            {props.eyebrow && (
              <div
                style={{
                  fontSize: "0.72rem",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "var(--color-muted)",
                  marginBottom: "0.5rem",
                }}
              >
                {props.eyebrow}
              </div>
            )}
            {props.heading && (
              <h2
                style={{
                  fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                  fontFamily: "var(--font-display)",
                  margin: 0,
                }}
              >
                {props.heading}
              </h2>
            )}
          </div>
        )}
        <ProductGrid
          products={products}
          columns={props.columns}
          variant={props.cardVariant}
          showCategory={props.showCategory}
          showPrice={props.showPrice}
          showDiscount={props.showDiscount}
          cardAspectRatio={props.cardAspectRatio}
        />
      </div>
    </section>
  );
}

export function CategoryTilesBlock({
  props,
  dataContext,
}: BlockComponentProps<CategoryTilesProps>) {
  return (
    <CategoryTiles
      categories={dataContext.categories}
      columns={props.columns}
      aspectRatio={props.aspectRatio ?? "4/5"}
      heading={props.heading ?? "Shop by category"}
    />
  );
}
