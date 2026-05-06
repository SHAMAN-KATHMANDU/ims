"use client";

/**
 * CartLineItemsBlock — renders the active cart contents on the cart page.
 *
 * Reads cart state from the existing CartProvider (client-only). Designed
 * to pair with OrderSummaryBlock — typically the two sit side-by-side on
 * the cart scope.
 */

import Link from "next/link";
import Image from "next/image";
import type { CartLineItemsProps } from "@repo/shared";
import type { BlockComponentProps } from "../registry";
import { useCart } from "../../cart/CartProvider";
import { formatPrice, getSiteFormatOptions } from "@/lib/format";
import { lineTotal } from "@/lib/cart";

export function CartLineItemsBlock({
  props,
  dataContext,
}: BlockComponentProps<CartLineItemsProps>) {
  const { cart, hydrated, removeItem, updateQty } = useCart();
  const showVariants = props.showVariants ?? true;
  const showRemove = props.showRemove ?? true;
  const qtyControls = props.qtyControls ?? "stepper";
  const aspect = props.thumbnailAspect ?? "1/1";
  const empty = props.emptyStateText ?? "Your cart is empty.";
  const heading = props.heading;
  const fmt = getSiteFormatOptions(dataContext.site);
  // Cart-side currency wins over site default if explicitly set.
  if (cart.currency) fmt.currency = cart.currency;

  if (hydrated && cart.items.length === 0) {
    return (
      <div
        className="container"
        style={{ padding: "var(--section-padding) 0" }}
      >
        {heading && (
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
              marginBottom: "1rem",
            }}
          >
            {heading}
          </h1>
        )}
        <p
          style={{
            color: "var(--color-muted)",
            fontSize: "1rem",
            padding: "2rem 0",
          }}
        >
          {empty}{" "}
          <Link
            href="/products"
            style={{
              color: "var(--color-text)",
              borderBottom: "1px solid currentColor",
            }}
          >
            Continue shopping
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: "var(--section-padding) 0" }}>
      {heading && (
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
            marginBottom: "1.25rem",
          }}
        >
          {heading}
        </h1>
      )}
      <ul
        aria-label="Cart line items"
        style={{ listStyle: "none", padding: 0, margin: 0 }}
      >
        {cart.items.map((item) => {
          const lineKey = `${item.productId}::${item.variationId ?? ""}::${item.subVariationId ?? ""}`;
          return (
            <li
              key={lineKey}
              style={{
                display: "grid",
                gridTemplateColumns: "96px 1fr auto",
                gap: "1rem",
                padding: "1rem 0",
                borderBottom: "1px solid var(--color-border)",
                alignItems: "start",
              }}
            >
              <div
                style={{
                  position: "relative",
                  aspectRatio: aspect,
                  background: "var(--color-surface)",
                  overflow: "hidden",
                }}
              >
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.productName}
                    fill
                    sizes="96px"
                    style={{ objectFit: "cover" }}
                  />
                ) : null}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.05rem",
                    fontWeight: 500,
                    marginBottom: 4,
                  }}
                >
                  <Link
                    href={`/products/${item.productId}`}
                    style={{ color: "inherit", textDecoration: "none" }}
                  >
                    {item.productName}
                  </Link>
                </div>
                {showVariants && item.variationLabel && (
                  <div
                    style={{
                      color: "var(--color-muted)",
                      fontSize: "0.85rem",
                      marginBottom: 8,
                    }}
                  >
                    {item.variationLabel}
                  </div>
                )}
                <QtyControl
                  variant={qtyControls}
                  qty={item.quantity}
                  onChange={(next) =>
                    updateQty(
                      {
                        productId: item.productId,
                        variationId: item.variationId,
                        subVariationId: item.subVariationId,
                      },
                      next,
                    )
                  }
                />
                {showRemove && (
                  <button
                    type="button"
                    onClick={() =>
                      removeItem({
                        productId: item.productId,
                        variationId: item.variationId,
                        subVariationId: item.subVariationId,
                      })
                    }
                    style={{
                      marginLeft: 12,
                      background: "none",
                      border: "none",
                      color: "var(--color-muted)",
                      fontSize: "0.8rem",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1rem",
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                }}
              >
                {formatPrice(lineTotal(item), fmt)}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function QtyControl({
  variant,
  qty,
  onChange,
}: {
  variant: "stepper" | "input";
  qty: number;
  onChange: (next: number) => void;
}) {
  if (variant === "input") {
    return (
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={99}
        value={qty}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
        style={{
          width: 64,
          padding: "6px 8px",
          background: "var(--color-background)",
          border: "1px solid var(--color-border)",
          color: "inherit",
          fontFamily: "inherit",
          fontSize: "0.9rem",
          textAlign: "center",
        }}
        aria-label="Quantity"
      />
    );
  }
  return (
    <div
      role="group"
      aria-label="Quantity"
      style={{
        display: "inline-flex",
        border: "1px solid var(--color-border)",
        background: "var(--color-background)",
      }}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(1, qty - 1))}
        aria-label="Decrease quantity"
        style={{
          padding: "4px 10px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "inherit",
          fontFamily: "inherit",
        }}
      >
        −
      </button>
      <span
        style={{
          padding: "4px 14px",
          minWidth: 32,
          textAlign: "center",
          fontVariantNumeric: "tabular-nums",
          fontSize: "0.9rem",
        }}
      >
        {qty}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(99, qty + 1))}
        aria-label="Increase quantity"
        style={{
          padding: "4px 10px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "inherit",
          fontFamily: "inherit",
        }}
      >
        +
      </button>
    </div>
  );
}
