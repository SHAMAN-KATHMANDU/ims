/**
 * ProductCard — the card primitive used across listings, grids and the
 * carousel. Lives in its own file (not shared.tsx) so that client
 * components like ProductCarousel can import it without dragging the
 * server-only nav loaders from shared.tsx into the client bundle.
 *
 * shared.tsx re-exports ProductCard + ProductGrid so existing imports
 * keep working unchanged.
 */

import Link from "next/link";
import type { PublicProduct } from "@/lib/api";
import { QuickAddButton } from "@/components/cart/QuickAddButton";
import { StarRating } from "@/components/blocks/kinds/StarRating";

function formatPrice(value: string | number): string {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function PriceDisplay({
  product,
  hasDiscount,
}: {
  product: PublicProduct;
  hasDiscount: boolean;
}) {
  const priceFrom = product.priceFrom ?? product.finalSp;
  const priceTo = product.priceTo ?? product.finalSp;
  const isRange =
    (product.variationCount ?? 0) > 1 &&
    priceFrom !== priceTo &&
    Number(priceFrom) !== Number(priceTo);

  const priceStyle = {
    fontWeight: 600,
    color: "var(--color-text)",
    fontFamily: "var(--font-display)",
  } as const;

  if (isRange) {
    return (
      <span
        style={priceStyle}
        aria-label={`Price from ${formatPrice(priceFrom)}`}
      >
        <span
          aria-hidden="true"
          style={{
            fontSize: "0.72em",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--color-muted)",
            marginRight: "0.35rem",
          }}
        >
          From
        </span>
        <span aria-hidden="true">{formatPrice(priceFrom)}</span>
      </span>
    );
  }

  return (
    <>
      <span
        style={priceStyle}
        aria-label={`Price ${formatPrice(product.finalSp)}`}
      >
        {formatPrice(product.finalSp)}
      </span>
      {hasDiscount && (
        <span
          aria-label={`Original price ${formatPrice(product.mrp)}`}
          style={{
            textDecoration: "line-through",
            color: "var(--color-muted)",
            fontSize: "0.88rem",
          }}
        >
          {formatPrice(product.mrp)}
        </span>
      )}
    </>
  );
}

export function ProductCard({
  product,
  variant = "bordered",
  showCategory,
  showPrice,
  showDiscount,
  aspectRatio = "3 / 4",
  priority = false,
}: {
  product: PublicProduct;
  variant?: "bordered" | "bare" | "card";
  showCategory?: boolean;
  showPrice?: boolean;
  showDiscount?: boolean;
  aspectRatio?: string;
  priority?: boolean;
}) {
  const hasDiscount =
    product.finalSp &&
    product.mrp &&
    Number(product.finalSp) < Number(product.mrp);

  const isNew =
    product.dateCreated &&
    new Date(product.dateCreated).getTime() >
      Date.now() - 30 * 24 * 60 * 60 * 1000;

  const border =
    variant === "bare"
      ? "none"
      : variant === "card"
        ? "1px solid var(--color-border)"
        : "1px solid var(--color-border)";
  const background =
    variant === "card" ? "var(--color-surface)" : "var(--color-background)";
  const boxShadow = variant === "card" ? "0 2px 14px rgba(0,0,0,0.06)" : "none";

  const showQuickAdd = !(
    (product.variationCount ?? 0) > 1 &&
    product.priceFrom !== undefined &&
    product.priceTo !== undefined &&
    product.priceFrom !== product.priceTo
  );

  return (
    <article
      className="tpl-product-card"
      style={{
        position: "relative",
        display: "block",
        borderRadius: "var(--radius)",
        border,
        background,
        boxShadow,
        overflow: "hidden",
        color: "var(--color-text)",
        transition:
          "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.2s ease",
      }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio,
          background: "var(--color-surface)",
          overflow: "hidden",
        }}
      >
        {product.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.photoUrl}
            alt=""
            aria-hidden="true"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="tpl-product-card-img"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              transition: "transform 0.45s ease",
            }}
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.78rem",
              color: "var(--color-muted)",
              fontFamily: "var(--font-heading)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {product.imsCode}
          </div>
        )}
        {showDiscount !== false && hasDiscount && (
          <span
            aria-label={`${Math.round(
              (1 - Number(product.finalSp) / Number(product.mrp)) * 100,
            )} percent off`}
            style={{
              position: "absolute",
              top: "0.85rem",
              left: "0.85rem",
              padding: "0.3rem 0.65rem",
              background: "var(--color-text)",
              color: "var(--color-background)",
              fontSize: "0.68rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              borderRadius: 999,
            }}
          >
            {Math.round(
              (1 - Number(product.finalSp) / Number(product.mrp)) * 100,
            )}
            % OFF
          </span>
        )}
        {isNew && (
          <span
            style={{
              position: "absolute",
              top: "0.85rem",
              right: "0.85rem",
              padding: "0.3rem 0.65rem",
              background: "var(--color-primary)",
              color: "var(--color-primary-foreground, #fff)",
              fontSize: "0.68rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              borderRadius: 999,
            }}
          >
            New
          </span>
        )}
        {/* Skip QuickAdd when the product has multiple variations with
            diverging prices — the card shows "From X" but we don't know
            which variant the customer wants. The overlay link takes them
            to the PDP where they can pick. QuickAdd sits on TOP of the
            link via higher z-index so clicks/keyboard hits reach it. */}
        {showQuickAdd && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: "auto",
              }}
            >
              <QuickAddButton
                productId={product.id}
                productName={product.name}
                unitPrice={Number(product.finalSp)}
                imageUrl={product.photoUrl ?? null}
              />
            </div>
          </div>
        )}
      </div>
      <div
        style={{
          padding: "1.25rem 1.35rem 1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
        }}
      >
        {showCategory !== false && product.category && (
          <div
            style={{
              fontSize: "0.66rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--color-muted)",
              fontWeight: 500,
            }}
          >
            {product.category.name}
          </div>
        )}
        <h3
          style={{
            fontWeight: 500,
            fontSize: "1.08rem",
            lineHeight: 1.3,
            color: "var(--color-text)",
            fontFamily: "var(--font-heading)",
            // Two-line clamp so long product names don't break the grid.
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            margin: 0,
          }}
        >
          <Link
            href={`/products/${product.id}`}
            style={{
              color: "inherit",
              textDecoration: "none",
              // Overlay link: stretches over the whole card so the entire
              // article is clickable, but QuickAdd (higher z-index) wins.
              outlineOffset: "2px",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 1,
              }}
            />
            {product.name}
          </Link>
        </h3>
        {product.avgRating != null &&
          product.ratingCount != null &&
          product.ratingCount > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                marginTop: "0.15rem",
              }}
            >
              <StarRating value={product.avgRating} size="sm" hideLabel />
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--color-muted)",
                  fontVariantNumeric: "tabular-nums",
                }}
                aria-label={`Rated ${product.avgRating.toFixed(
                  1,
                )} out of 5 from ${product.ratingCount} ${
                  product.ratingCount === 1 ? "review" : "reviews"
                }`}
              >
                {product.avgRating.toFixed(1)}{" "}
                <span aria-hidden="true">({product.ratingCount})</span>
              </span>
            </div>
          )}
        {showPrice !== false && (
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "0.65rem",
              fontSize: "1.02rem",
              marginTop: "0.25rem",
            }}
          >
            <PriceDisplay product={product} hasDiscount={!!hasDiscount} />
          </div>
        )}
      </div>
    </article>
  );
}
