"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { postGuestOrder } from "@/lib/api";

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={48}
      height={48}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

/**
 * Checkout form — guest details + submit to `/public/orders`.
 *
 * Validation is intentionally light: name non-empty, phone length >= 6,
 * email optional but checked if provided. The backend re-validates
 * everything (the zod schema is the source of truth) and computes the
 * subtotal from the items snapshot, so the client can't lie.
 *
 * On success: clear the cart, show a confirmation screen with the
 * order code + instructions, and offer to keep shopping.
 */

function formatPrice(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString("en-IN")}`;
  }
}

export function CheckoutForm({
  host,
  tenantId,
}: {
  host: string;
  tenantId: string;
}) {
  const router = useRouter();
  const { cart, hydrated, subtotal, itemCount, clearCart } = useCart();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedCode, setConfirmedCode] = useState<string | null>(null);

  if (!hydrated) {
    return <p style={{ color: "var(--color-muted)" }}>Loading checkout…</p>;
  }

  if (confirmedCode) {
    return (
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          textAlign: "center",
          padding: "2rem 0",
        }}
      >
        <div style={{ color: "var(--color-primary)", marginBottom: "1.25rem" }}>
          <CheckIcon />
        </div>
        <h1
          style={{
            fontSize: "clamp(1.875rem, 3vw, 2.25rem)",
            fontFamily: "var(--font-display)",
            marginBottom: "0.75rem",
          }}
        >
          Order received
        </h1>
        <p
          style={{
            color: "var(--color-muted)",
            marginBottom: "1rem",
          }}
        >
          Your reference number is
        </p>
        <div
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            borderRadius: "var(--radius)",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: "1.1rem",
            marginBottom: "1.5rem",
          }}
        >
          {confirmedCode}
        </div>
        <p
          style={{
            color: "var(--color-muted)",
            lineHeight: 1.7,
            marginBottom: "2rem",
          }}
        >
          We&apos;ll call or message you within a few hours to confirm the
          details and arrange delivery. Nothing has been charged — payment
          happens after we confirm the order with you.
        </p>
        <Link href="/products" className="btn">
          Keep shopping
        </Link>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "2rem 0",
        }}
      >
        <p style={{ color: "var(--color-muted)", marginBottom: "1rem" }}>
          Your cart is empty. Add something first.
        </p>
        <Link href="/products" className="btn">
          Browse products
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (phone.trim().length < 6) {
      setError("Please enter a valid phone number.");
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email or leave it blank.");
      return;
    }

    setSubmitting(true);
    try {
      const resp = await postGuestOrder(host, tenantId, {
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim() || undefined,
        customerNote: note.trim() || undefined,
        items: cart.items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          lineTotal: i.unitPrice * i.quantity,
          variationId: i.variationId ?? null,
          subVariationId: i.subVariationId ?? null,
          variationLabel: i.variationLabel ?? null,
        })),
      });
      if (!resp || !resp.orderCode) {
        throw new Error(resp?.message ?? "Checkout failed");
      }
      clearCart();
      setConfirmedCode(resp.orderCode);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      // tpl-stack collapses the 2-col grid to 1-col on ≤ 768px via the
      // shared globals.css media query — fixes the mobile checkout where
      // the form was wrapping awkwardly inside a 2-col layout that ignored
      // viewport width.
      className="tpl-stack checkout-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr",
        gap: "2.5rem",
        alignItems: "start",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(1.875rem, 3vw, 2.25rem)",
            fontFamily: "var(--font-display)",
            marginBottom: "0.5rem",
          }}
        >
          Checkout
        </h1>
        <p
          style={{
            color: "var(--color-muted)",
            marginBottom: "0.5rem",
          }}
        >
          We don&apos;t ask for an account. Leave your name and phone —
          we&apos;ll call or message to confirm, and payment is arranged at that
          time.
        </p>

        <label
          htmlFor="checkout-name"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
          }}
        >
          <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
            Name <span style={{ color: "var(--color-primary)" }}>*</span>
          </span>
          <input
            id="checkout-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            style={{
              padding: "0.85rem 1.1rem",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius)",
              background: "var(--color-background)",
              color: "var(--color-text)",
              fontSize: "1rem",
              fontFamily: "inherit",
            }}
          />
        </label>

        <label
          htmlFor="checkout-phone"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
          }}
        >
          <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
            Phone <span style={{ color: "var(--color-primary)" }}>*</span>
          </span>
          <input
            id="checkout-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+977 98xxxxxxxx"
            required
            style={{
              padding: "0.85rem 1.1rem",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius)",
              background: "var(--color-background)",
              color: "var(--color-text)",
              fontSize: "1rem",
              fontFamily: "inherit",
            }}
          />
        </label>

        <label
          htmlFor="checkout-email"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
          }}
        >
          <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
            Email{" "}
            <span style={{ color: "var(--color-muted)", fontWeight: 400 }}>
              (optional)
            </span>
          </span>
          <input
            id="checkout-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{
              padding: "0.85rem 1.1rem",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius)",
              background: "var(--color-background)",
              color: "var(--color-text)",
              fontSize: "1rem",
              fontFamily: "inherit",
            }}
          />
        </label>

        <label
          htmlFor="checkout-note"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
          }}
        >
          <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
            Note{" "}
            <span style={{ color: "var(--color-muted)", fontWeight: 400 }}>
              (optional)
            </span>
          </span>
          <textarea
            id="checkout-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Any notes for the shop? Delivery address, variations, preferred call time…"
            style={{
              padding: "0.85rem 1.1rem",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius)",
              background: "var(--color-background)",
              color: "var(--color-text)",
              fontSize: "1rem",
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
        </label>

        {error && (
          <div
            role="alert"
            style={{
              padding: "0.75rem 1rem",
              background: "var(--color-error-bg)",
              border: "1px solid var(--color-error-border)",
              borderRadius: "var(--radius)",
              color: "var(--color-text)",
              fontSize: "0.9rem",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn"
          disabled={submitting}
          style={{
            marginTop: "0.75rem",
            justifyContent: "center",
            ...(submitting ? { opacity: 0.5, cursor: "not-allowed" } : {}),
          }}
        >
          {submitting ? "Sending…" : "Place order"}
        </button>
      </form>

      <aside
        style={{
          padding: "1.5rem",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius)",
          background: "var(--color-surface)",
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
          Order summary
        </h2>
        <ul
          style={{
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            marginBottom: "1rem",
            fontSize: "0.9rem",
          }}
        >
          {cart.items.map((i) => (
            <li
              key={`${i.productId}:${i.variationId ?? ""}:${i.subVariationId ?? ""}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "1rem",
              }}
            >
              <span
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {i.productName}
                {i.variationLabel ? ` (${i.variationLabel})` : ""} ×{" "}
                {i.quantity}
              </span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatPrice(i.unitPrice * i.quantity, cart.currency)}
              </span>
            </li>
          ))}
        </ul>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: 600,
            fontSize: "1.05rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid var(--color-border)",
          }}
        >
          <span>Subtotal</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {formatPrice(subtotal, cart.currency)}
          </span>
        </div>
        <p
          style={{
            marginTop: "0.75rem",
            fontSize: "0.75rem",
            color: "var(--color-muted)",
            lineHeight: 1.5,
          }}
        >
          {itemCount} item{itemCount === 1 ? "" : "s"}. Shipping + taxes
          confirmed when the shop contacts you.
        </p>
      </aside>
    </div>
  );
}
