import type { PdpBuyboxProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";
import { formatPrice } from "../../utils/format";

export function PdpBuyboxBlock({
  props,
  dataContext,
}: BlockComponentProps<PdpBuyboxProps>) {
  const { locale = "en-IN", currency = "INR" } = dataContext.site || {};
  const product =
    dataContext.activeProduct ?? dataContext.products?.[0] ?? null;
  const productName = product?.name ?? "Product Name";
  const productPrice = product?.price ?? 0;

  return (
    <div
      style={{
        padding: "1.5rem",
        border: "1px solid #ddd",
        borderRadius: "8px",
        marginBlock: "1rem",
      }}
    >
      <h1
        style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem" }}
      >
        {productName}
      </h1>
      <p
        style={{
          fontSize:
            props.priceSize === "lg"
              ? "1.5rem"
              : props.priceSize === "sm"
                ? "1rem"
                : "1.25rem",
          color: "#4a90e2",
          fontWeight: 600,
          marginBottom: "1rem",
        }}
      >
        {formatPrice(productPrice, { locale, currency })}
      </p>
      {props.showVariantPicker !== false && (
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <label style={{ fontSize: "0.875rem" }}>Quantity:</label>
          <input
            type="number"
            defaultValue="1"
            min="1"
            style={{
              width: "60px",
              padding: "0.5rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
            disabled
          />
        </div>
      )}
      {props.showAddToCart !== false && (
        <button
          style={{
            width: "100%",
            padding: "1rem",
            backgroundColor: "#4a90e2",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: 600,
            marginBottom: "0.5rem",
          }}
          disabled
        >
          Add to Cart
        </button>
      )}
      <button
        style={{
          width: "100%",
          padding: "1rem",
          backgroundColor: "transparent",
          color: "#4a90e2",
          border: "2px solid #4a90e2",
          borderRadius: "4px",
          cursor: "pointer",
          fontWeight: 600,
        }}
        disabled
      >
        Buy Now
      </button>
    </div>
  );
}
