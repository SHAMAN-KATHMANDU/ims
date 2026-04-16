"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";

export function QuickAddButton({
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
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({ productId, productName, unitPrice, imageUrl, quantity: 1 });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="tpl-quick-add"
      style={{
        position: "absolute",
        bottom: "0.75rem",
        left: "0.75rem",
        right: "0.75rem",
        padding: "0.55rem",
        textAlign: "center",
        background: "var(--color-primary)",
        color: "var(--color-on-primary, #fff)",
        border: "none",
        borderRadius: "var(--radius)",
        cursor: "pointer",
        fontSize: "0.8rem",
        fontWeight: 600,
        opacity: 0,
        transform: "translateY(8px)",
        transition: "opacity 0.2s ease, transform 0.2s ease",
      }}
    >
      {added ? "Added \u2713" : "Add to cart"}
    </button>
  );
}
