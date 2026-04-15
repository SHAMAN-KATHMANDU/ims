"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

// Inline bag icon — we don't depend on an icon lib in tenant-site.
function BagIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 7h16l-1.5 13a2 2 0 0 1-2 1.8H7.5a2 2 0 0 1-2-1.8L4 7Z" />
      <path d="M8 7V5a4 4 0 0 1 8 0v2" />
    </svg>
  );
}

/**
 * Cart link + item-count badge for the SiteHeader.
 *
 * Renders a placeholder count (blank) until `hydrated` is true — that
 * avoids the flash-of-wrong-count when a returning visitor with 3
 * items in localStorage lands on the page and initially sees "0".
 */
export function CartBadge() {
  const { itemCount, hydrated } = useCart();

  return (
    <Link
      href="/cart"
      aria-label="Open cart"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        color: "var(--color-text)",
        opacity: 0.85,
        fontSize: "0.9rem",
      }}
    >
      <BagIcon />
      <span>Cart</span>
      {hydrated && itemCount > 0 && (
        <span
          aria-hidden
          style={{
            minWidth: 18,
            height: 18,
            padding: "0 5px",
            borderRadius: 999,
            background: "var(--color-primary)",
            color: "var(--color-background)",
            fontSize: "0.7rem",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </Link>
  );
}
