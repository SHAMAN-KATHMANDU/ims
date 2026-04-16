"use client";

import { useState, useEffect, useRef } from "react";
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
  const buyboxRef = useRef<HTMLDivElement>(null);
  const [offScreen, setOffScreen] = useState(false);

  useEffect(() => {
    const el = buyboxRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setOffScreen(!entry!.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        ref={buyboxRef}
        style={{ display: "flex", alignItems: "center", gap: "1rem" }}
      >
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

      {offScreen && (
        <div
          className="tpl-mobile-only"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "0.75rem 1rem",
            background: "var(--color-background)",
            borderTop: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            zIndex: 40,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontWeight: 500,
                fontSize: "0.9rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {productName}
            </div>
            <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
              ₹{unitPrice.toLocaleString("en-IN")}
            </div>
          </div>
          <AddToCartButton
            productId={productId}
            productName={productName}
            unitPrice={unitPrice}
            imageUrl={imageUrl}
            quantity={1}
          />
        </div>
      )}
    </>
  );
}
