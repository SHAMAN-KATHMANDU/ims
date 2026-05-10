/**
 * Commerce blocks — hero, product grid, category tiles.
 *
 * These thin wrappers translate BlockProps to the existing shared.tsx
 * primitives. We keep the primitives as the implementation of record so
 * the legacy pickTemplate rendering path and the new block path produce
 * the same visual output during Phase 8's migration window.
 */

import { Suspense } from "react";
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
import { getSiteFormatOptions } from "@/lib/format";
import { normalizeImageRef } from "@/lib/image";
import type { BlockComponentProps } from "../registry";
import { ProductCarousel } from "./ProductCarousel";
import { BlockGridSkeleton } from "./BlockSkeletons";
import { resolveProductGridFromDataContext } from "../resolvers/product-grid";

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
      imageUrl={normalizeImageRef(props.imageUrl)}
      heroLayout={props.heroLayout}
      videoUrl={props.videoUrl}
      videoPoster={normalizeImageRef(props.videoPoster)}
      shoppableProducts={shoppableProducts}
    />
  );
}

export function ProductGridBlock(args: BlockComponentProps<ProductGridProps>) {
  const { node, props } = args;
  // Only `offers` + `collection` sources hit the network; the others filter
  // pre-loaded products synchronously. Wrap just the fetching paths in
  // Suspense so the page shell streams while the fetch resolves.
  const fetches = props.source === "offers" || props.source === "collection";
  if (!fetches) {
    return <ProductGridInner {...args} />;
  }
  const wrapperHasPadY = node.style?.paddingY !== undefined;
  const layout = props.layout ?? "grid";
  return (
    <Suspense
      fallback={
        <BlockGridSkeleton
          wrapperHasPadY={wrapperHasPadY}
          columns={props.columns}
          count={props.limit}
          aspectRatio={layout === "carousel" ? "3/4" : "3/4"}
        />
      }
    >
      <ProductGridInner {...args} />
    </Suspense>
  );
}

async function ProductGridInner({
  node,
  props,
  dataContext,
}: BlockComponentProps<ProductGridProps>) {
  const products = await resolveProductGridFromDataContext(props, dataContext);
  const layout = props.layout ?? "grid";
  const wrapperHasPadY = node.style?.paddingY !== undefined;
  const formatOpts = getSiteFormatOptions(dataContext.site);

  return (
    <section
      style={{
        padding: wrapperHasPadY ? undefined : "var(--section-padding) 0",
      }}
    >
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
            formatOpts={formatOpts}
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
            formatOpts={formatOpts}
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
