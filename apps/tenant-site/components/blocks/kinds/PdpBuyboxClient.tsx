"use client";

import { useState } from "react";
import { AddToCartButton } from "@/components/cart/AddToCartButton";

export function PdpBuyboxClient({
  productId,
  productName,
  unitPrice,
  imageUrl,
}: {
  productId: string;
  productName: string;
  unitPrice: number;
  imageUrl: string | null;
}) {
  const [qty, setQty] = useState(1);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius)",
        }}
      >
        <button
          type="button"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          style={{
            padding: "0.5rem 0.75rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          −
        </button>
        <span
          style={{
            minWidth: "2.5rem",
            textAlign: "center",
            fontSize: "0.95rem",
            fontWeight: 500,
          }}
        >
          {qty}
        </span>
        <button
          type="button"
          onClick={() => setQty((q) => Math.min(99, q + 1))}
          style={{
            padding: "0.5rem 0.75rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          +
        </button>
      </div>
      <AddToCartButton
        productId={productId}
        productName={productName}
        unitPrice={unitPrice}
        imageUrl={imageUrl}
        quantity={qty}
      />
    </div>
  );
}
