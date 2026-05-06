"use client";

/**
 * OrderSummaryBlock — subtotal / shipping / tax / total + checkout CTA.
 *
 * Typically pairs with CartLineItemsBlock on the cart scope. Reads the
 * cart from CartProvider; tax + shipping are placeholders here (computed
 * during checkout) so this block focuses on subtotal + the CTA path.
 */

import { useState } from "react";
import Link from "next/link";
import type { OrderSummaryProps } from "@repo/shared";
import type { BlockComponentProps } from "../registry";
import { useCart } from "../../cart/CartProvider";
import { formatPrice, getSiteFormatOptions } from "@/lib/format";

export function OrderSummaryBlock({
  props,
  dataContext,
}: BlockComponentProps<OrderSummaryProps>) {
  const { cart, hydrated, subtotal, itemCount, isEmpty } = useCart();
  const heading = props.heading ?? "Summary";
  const checkoutLabel = props.checkoutLabel ?? "Checkout";
  const showPromo = props.showPromoCode ?? true;
  const showShip = props.showShippingEstimator ?? false;
  const showTrust = props.showTrustBadges ?? true;
  const sub = props.subText;

  const fmt = getSiteFormatOptions(dataContext.site);
  if (cart.currency) fmt.currency = cart.currency;

  const [promo, setPromo] = useState("");
  const [zip, setZip] = useState("");

  return (
    <aside
      aria-label="Order summary"
      style={{
        background: "var(--color-surface)",
        padding: "1.75rem",
        alignSelf: "start",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-card, 0)",
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.15rem",
          margin: 0,
          marginBottom: "0.875rem",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {heading}
      </h2>
      <SummaryRow
        label={`Subtotal · ${itemCount} item${itemCount === 1 ? "" : "s"}`}
        value={formatPrice(hydrated ? subtotal : 0, fmt)}
      />
      {showShip && <ShippingEstimator zip={zip} setZip={setZip} />}
      {showPromo && <PromoInput promo={promo} setPromo={setPromo} />}
      <SummaryRow label="Shipping" value="Calculated at checkout" muted />
      <SummaryRow label="Tax" value="Calculated at checkout" muted />
      <SummaryRow
        label="Total"
        value={formatPrice(hydrated ? subtotal : 0, fmt)}
        emphasize
      />
      <Link
        href="/checkout"
        aria-disabled={isEmpty}
        tabIndex={isEmpty ? -1 : 0}
        style={{
          display: "block",
          marginTop: "1rem",
          textAlign: "center",
          padding: "0.875rem 1.25rem",
          background: isEmpty
            ? "color-mix(in srgb, var(--color-text) 30%, transparent)"
            : "var(--color-primary)",
          color: "var(--color-on-primary, var(--color-background))",
          textDecoration: "none",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontSize: "0.85rem",
          fontWeight: 600,
          pointerEvents: isEmpty ? "none" : "auto",
        }}
      >
        {checkoutLabel}
      </Link>
      {sub && (
        <p
          style={{
            marginTop: "0.875rem",
            textAlign: "center",
            fontSize: "0.78rem",
            color: "var(--color-muted)",
            letterSpacing: "0.04em",
          }}
        >
          {sub}
        </p>
      )}
      {showTrust && <TrustBadges />}
    </aside>
  );
}

function SummaryRow({
  label,
  value,
  emphasize,
  muted,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "0.5rem 0",
        fontSize: emphasize ? "1.05rem" : "0.875rem",
        fontWeight: emphasize ? 600 : 400,
        color: muted ? "var(--color-muted)" : "inherit",
        borderTop: emphasize ? "1px solid var(--color-border)" : undefined,
        marginTop: emphasize ? "0.5rem" : undefined,
        paddingTop: emphasize ? "0.875rem" : undefined,
        fontFamily: emphasize ? "var(--font-display)" : "inherit",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function PromoInput({
  promo,
  setPromo,
}: {
  promo: string;
  setPromo: (v: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        margin: "0.75rem 0",
        border: "1px solid var(--color-border)",
        background: "var(--color-background)",
      }}
    >
      <input
        type="text"
        value={promo}
        onChange={(e) => setPromo(e.target.value)}
        placeholder="Promo code"
        aria-label="Promo code"
        style={{
          flex: 1,
          padding: "0.625rem 0.75rem",
          background: "transparent",
          border: "none",
          color: "inherit",
          fontFamily: "inherit",
          fontSize: "0.85rem",
          outline: "none",
        }}
      />
      <button
        type="button"
        style={{
          background: "none",
          border: "none",
          color: "inherit",
          fontSize: "0.75rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontWeight: 600,
          cursor: "pointer",
          padding: "0 0.875rem",
        }}
      >
        Apply
      </button>
    </div>
  );
}

function ShippingEstimator({
  zip,
  setZip,
}: {
  zip: string;
  setZip: (v: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        margin: "0.75rem 0",
        border: "1px solid var(--color-border)",
        background: "var(--color-background)",
      }}
    >
      <input
        type="text"
        value={zip}
        onChange={(e) => setZip(e.target.value)}
        placeholder="Postal / ZIP"
        aria-label="Postal code"
        style={{
          flex: 1,
          padding: "0.625rem 0.75rem",
          background: "transparent",
          border: "none",
          color: "inherit",
          fontFamily: "inherit",
          fontSize: "0.85rem",
          outline: "none",
        }}
      />
      <button
        type="button"
        style={{
          background: "none",
          border: "none",
          color: "inherit",
          fontSize: "0.75rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontWeight: 600,
          cursor: "pointer",
          padding: "0 0.875rem",
        }}
      >
        Estimate
      </button>
    </div>
  );
}

function TrustBadges() {
  return (
    <div
      aria-label="Secure checkout"
      style={{
        marginTop: "1.25rem",
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
        justifyContent: "center",
        alignItems: "center",
        fontSize: "0.7rem",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--color-muted)",
      }}
    >
      <span>🔒 Secure checkout</span>
      <span>·</span>
      <span>↩ 30-day returns</span>
    </div>
  );
}
