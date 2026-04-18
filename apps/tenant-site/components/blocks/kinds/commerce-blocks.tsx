/**
 * Commerce blocks — hero, product grid, category tiles.
 *
 * These thin wrappers translate BlockProps to the existing shared.tsx
 * primitives. We keep the primitives as the implementation of record so
 * the legacy pickTemplate rendering path and the new block path produce
 * the same visual output during Phase 8's migration window.
 */

import Link from "next/link";
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
import { getCollection, getOffers } from "@/lib/api";
import type { BlockComponentProps } from "../registry";
import { ProductCarousel } from "./ProductCarousel";

export function HeroBlock({
  props,
  dataContext,
}: BlockComponentProps<HeroProps>) {
  const shoppableProducts =
    props.variant === "shoppable" && props.shoppableProductIds?.length
      ? (() => {
          const byId = new Map(
            dataContext.products.map((p) => [p.id, p] as const),
          );
          return props.shoppableProductIds
            .map((id) => byId.get(id))
            .filter((p): p is PublicProduct => !!p);
        })()
      : undefined;

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
      videoUrl={props.videoUrl}
      videoPoster={props.videoPoster}
      shoppableProducts={shoppableProducts}
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
  if (source === "on-sale") {
    return all
      .filter((p) => p.finalSp && p.mrp && Number(p.finalSp) < Number(p.mrp))
      .slice(0, opts.limit);
  }
  if (source === "newest") {
    return [...all]
      .sort(
        (a, b) =>
          new Date(b.dateCreated ?? 0).getTime() -
          new Date(a.dateCreated ?? 0).getTime(),
      )
      .slice(0, opts.limit);
  }
  if (source === "price-low") {
    return [...all]
      .sort((a, b) => Number(a.finalSp) - Number(b.finalSp))
      .slice(0, opts.limit);
  }
  if (source === "price-high") {
    return [...all]
      .sort((a, b) => Number(b.finalSp) - Number(a.finalSp))
      .slice(0, opts.limit);
  }
  return all.slice(0, opts.limit);
}

/**
 * Fetch the right product set for the grid's `source`. For the two new
 * sources (`collection`, `offers`) we hit dedicated endpoints so the
 * home page doesn't have to preload every possible dataset. For legacy
 * sources we keep reading from `dataContext.products`.
 */
async function resolveProducts(
  props: ProductGridProps,
  dataContext: BlockComponentProps<ProductGridProps>["dataContext"],
): Promise<PublicProduct[]> {
  if (props.source === "offers") {
    const res = await getOffers(dataContext.host, dataContext.tenantId, {
      limit: props.limit,
    });
    return res?.products ?? [];
  }
  if (props.source === "collection") {
    if (!props.collectionSlug) return [];
    const res = await getCollection(
      dataContext.host,
      dataContext.tenantId,
      props.collectionSlug,
      props.limit,
    );
    if (!res) return [];
    const collection = "collection" in res ? res.collection : res;
    return collection.products ?? [];
  }
  return selectProducts(dataContext.products, props.source, {
    categoryId: props.categoryId,
    productIds: props.productIds,
    limit: props.limit,
  });
}

export async function ProductGridBlock({
  props,
  dataContext,
}: BlockComponentProps<ProductGridProps>) {
  const products = await resolveProducts(props, dataContext);
  const layout = props.layout ?? "grid";

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
        {layout === "carousel" ? (
          <ProductCarousel
            products={products}
            cardVariant={props.cardVariant}
            showCategory={props.showCategory}
            showPrice={props.showPrice}
            showDiscount={props.showDiscount}
            cardAspectRatio={props.cardAspectRatio}
          />
        ) : (
          <ProductGrid
            products={products}
            columns={props.columns}
            variant={props.cardVariant}
            showCategory={props.showCategory}
            showPrice={props.showPrice}
            showDiscount={props.showDiscount}
            cardAspectRatio={props.cardAspectRatio}
          />
        )}
        {props.viewMoreHref && (
          <div
            style={{
              marginTop: "2rem",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Link
              href={props.viewMoreHref}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.75rem 1.5rem",
                minHeight: 44,
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius)",
                color: "var(--color-text)",
                fontSize: "0.9rem",
                textDecoration: "none",
              }}
            >
              {props.viewMoreLabel ?? "View more"}
            </Link>
          </div>
        )}
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
