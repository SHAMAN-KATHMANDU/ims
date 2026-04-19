"use client";

import Link from "next/link";
import { formatPrice as formatPriceShared } from "@/lib/format";
import { useCart } from "./CartProvider";

// Inline icons — tenant-site doesn't depend on an icon library.
const SvgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function Minus() {
  return (
    <svg {...SvgProps} width={14} height={14}>
      <path d="M5 12h14" />
    </svg>
  );
}
function Plus() {
  return (
    <svg {...SvgProps} width={14} height={14}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function Trash2() {
  return (
    <svg {...SvgProps} width={14} height={14}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M6 6l1.5 14a2 2 0 0 0 2 1.8h5a2 2 0 0 0 2-1.8L18 6" />
    </svg>
  );
}
function Bag() {
  return (
    <svg {...SvgProps} width={48} height={48}>
      <path d="M4 7h16l-1.5 13a2 2 0 0 1-2 1.8H7.5a2 2 0 0 1-2-1.8L4 7Z" />
      <path d="M8 7V5a4 4 0 0 1 8 0v2" />
    </svg>
  );
}

function formatPrice(value: number, currency: string): string {
  return formatPriceShared(value, { currency, showDecimals: false });
}

export function CartPage() {
  const { cart, hydrated, itemCount, subtotal, updateQty, removeItem } =
    useCart();

  if (!hydrated) {
    return (
      <div
        className="container"
        style={{ padding: "var(--section-padding) 0" }}
      >
        <p style={{ color: "var(--color-muted)" }}>Loading cart…</p>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div
        className="container"
        style={{
          padding: "var(--section-padding) 0",
          textAlign: "center",
          maxWidth: 520,
        }}
      >
        <div style={{ color: "var(--color-muted)", marginBottom: "1.25rem" }}>
          <Bag />
        </div>
        <h1
          style={{
            fontSize: "1.75rem",
            fontFamily: "var(--font-display)",
            marginBottom: "0.75rem",
          }}
        >
          Your cart is empty
        </h1>
        <p style={{ color: "var(--color-muted)", marginBottom: "1.75rem" }}>
          Add something from the shop and come back.
        </p>
        <Link href="/products" className="btn">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div
      className="container"
      style={{
        padding: "var(--section-padding) 0",
        display: "grid",
        gridTemplateColumns: "2fr 1fr",
        gap: "2.5rem",
      }}
      data-cart-layout="desktop"
    >
      <section>
        <h1
          style={{
            fontSize: "clamp(1.875rem, 3vw, 2.25rem)",
            fontFamily: "var(--font-display)",
            marginBottom: "0.5rem",
          }}
        >
          Your cart
        </h1>
        <p style={{ color: "var(--color-muted)", marginBottom: "2rem" }}>
          {itemCount} item{itemCount === 1 ? "" : "s"}
        </p>

        <ul
          style={{
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {cart.items.map((item) => (
            <li
              key={item.productId}
              style={{
                display: "grid",
                gridTemplateColumns: "72px minmax(0, 1fr) auto",
                gap: "1rem",
                padding: "1rem",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius)",
                background: "var(--color-surface)",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  aspectRatio: "1 / 1",
                  background:
                    "linear-gradient(135deg, var(--color-accent), var(--color-border))",
                  borderRadius: "var(--radius)",
                  overflow: "hidden",
                }}
              >
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.productName}
                    loading="lazy"
                    decoding="async"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                )}
              </div>

              <div style={{ minWidth: 0 }}>
                <Link
                  href={`/products/${item.productId}`}
                  style={{
                    fontWeight: 500,
                    color: "var(--color-text)",
                    display: "block",
                    marginBottom: "0.35rem",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.productName}
                </Link>
                {item.variationLabel && (
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--color-muted)",
                      marginBottom: "0.35rem",
                    }}
                  >
                    {item.variationLabel}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <button
                    type="button"
                    aria-label={`Decrease quantity of ${item.productName}`}
                    className="btn btn-ghost"
                    disabled={item.quantity <= 1}
                    onClick={() =>
                      updateQty(
                        {
                          productId: item.productId,
                          variationId: item.variationId ?? null,
                          subVariationId: item.subVariationId ?? null,
                        },
                        item.quantity - 1,
                      )
                    }
                    style={{
                      padding: "0.5rem",
                      minWidth: 44,
                      minHeight: 44,
                      border: "1px solid var(--color-border)",
                      opacity: item.quantity <= 1 ? 0.5 : 1,
                      cursor: item.quantity <= 1 ? "not-allowed" : "pointer",
                    }}
                  >
                    <Minus />
                  </button>
                  <span
                    aria-live="polite"
                    aria-atomic="true"
                    aria-label={`Quantity ${item.quantity}`}
                    style={{
                      minWidth: 32,
                      textAlign: "center",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label={`Increase quantity of ${item.productName}`}
                    className="btn btn-ghost"
                    onClick={() =>
                      updateQty(
                        {
                          productId: item.productId,
                          variationId: item.variationId ?? null,
                          subVariationId: item.subVariationId ?? null,
                        },
                        item.quantity + 1,
                      )
                    }
                    style={{
                      padding: "0.5rem",
                      minWidth: 44,
                      minHeight: 44,
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <Plus />
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: "0.5rem",
                }}
              >
                <div style={{ fontWeight: 600 }}>
                  {formatPrice(item.unitPrice * item.quantity, cart.currency)}
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${item.productName} from cart`}
                  onClick={() =>
                    removeItem({
                      productId: item.productId,
                      variationId: item.variationId ?? null,
                      subVariationId: item.subVariationId ?? null,
                    })
                  }
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--color-muted)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    fontSize: "0.8rem",
                    minHeight: 44,
                    padding: "0.5rem 0.25rem",
                  }}
                >
                  <Trash2 />
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <aside
        style={{
          padding: "1.5rem",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius)",
          background: "var(--color-surface)",
          alignSelf: "start",
          position: "sticky",
          top: "5rem",
        }}
      >
        <h2
          style={{
            fontSize: "0.85rem",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--color-muted)",
            marginBottom: "1rem",
          }}
        >
          Summary
        </h2>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "0.5rem",
          }}
        >
          <span>Subtotal</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {formatPrice(subtotal, cart.currency)}
          </span>
        </div>
        {subtotal < 5000 ? (
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--color-muted)",
              marginBottom: "0.5rem",
            }}
          >
            Add {formatPrice(5000 - subtotal, cart.currency)} more for free
            shipping
          </p>
        ) : (
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--color-success)",
              marginBottom: "0.5rem",
              fontWeight: 500,
            }}
          >
            Free shipping &#10003;
          </p>
        )}
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--color-muted)",
            marginBottom: "1.25rem",
          }}
        >
          Shipping + taxes calculated by the shop when they contact you.
        </p>
        <Link
          href="/checkout"
          className="btn"
          style={{ width: "100%", justifyContent: "center" }}
        >
          Proceed to checkout
        </Link>
        <Link
          href="/products"
          style={{
            display: "block",
            marginTop: "0.75rem",
            fontSize: "0.85rem",
            color: "var(--color-muted)",
            textAlign: "center",
          }}
        >
          Keep shopping
        </Link>
      </aside>
    </div>
  );
}
