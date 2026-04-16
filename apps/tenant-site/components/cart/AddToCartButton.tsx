"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "./CartProvider";

/**
 * Client-side button rendered inside ProductDetail (which stays a
 * server component). Takes the product's id / name / price as props so
 * nothing client-only leaks into the server tree above.
 *
 * After a successful add, shows a transient "Added — View cart" state
 * for 1.8s so the user gets confirmation without a toast layer.
 */
export function AddToCartButton({
  productId,
  productName,
  unitPrice,
  imageUrl,
  label = "Add to cart",
  quantity,
}: {
  productId: string;
  productName: string;
  unitPrice: number;
  imageUrl?: string | null;
  label?: string;
  quantity?: number;
}) {
  const { addItem, hydrated } = useCart();
  const [status, setStatus] = useState<"idle" | "added">("idle");

  const handleAdd = () => {
    addItem({
      productId,
      productName,
      unitPrice,
      imageUrl: imageUrl ?? null,
      quantity: quantity ?? 1,
    });
    setStatus("added");
    window.setTimeout(() => setStatus("idle"), 1800);
  };

  return (
    <div
      style={{ display: "inline-flex", alignItems: "center", gap: "0.75rem" }}
    >
      <button
        type="button"
        className="btn"
        onClick={handleAdd}
        disabled={!hydrated}
        style={{ minWidth: 180 }}
      >
        {status === "added" ? "Added ✓" : label}
      </button>
      {status === "added" && (
        <Link
          href="/cart"
          style={{
            fontSize: "0.85rem",
            color: "var(--color-primary)",
            textDecoration: "underline",
          }}
        >
          View cart
        </Link>
      )}
    </div>
  );
}
