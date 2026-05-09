import type { PdpDetailsProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function PdpDetailsBlock({
  props,
  dataContext,
}: BlockComponentProps<PdpDetailsProps>) {
  const product =
    dataContext.activeProduct ?? dataContext.products?.[0] ?? null;
  const sku = product?.sku ?? "—";
  const stock = product?.stock ?? 0;
  const description = product?.description ?? "";

  return (
    <div
      style={{
        padding: "1.5rem",
        border: "1px solid #ddd",
        borderRadius: "8px",
        marginBlock: "1rem",
      }}
    >
      <h3
        style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}
      >
        Product Details
      </h3>
      {props.tabs ? (
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            borderBottom: "1px solid #eee",
            marginBottom: "1rem",
            paddingBottom: "0.5rem",
            fontSize: "0.875rem",
            color: "#4a90e2",
          }}
        >
          <span style={{ fontWeight: 600 }}>Specs</span>
          <span style={{ color: "#737373" }}>Description</span>
          <span style={{ color: "#737373" }}>Shipping</span>
        </div>
      ) : null}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          fontSize: "0.875rem",
        }}
      >
        <div>
          <strong>SKU:</strong> {sku}
        </div>
        <div>
          <strong>Availability:</strong>{" "}
          {stock > 0 ? "In Stock" : "Out of Stock"}
        </div>
      </div>
      {description ? (
        <p
          style={{
            marginTop: "1rem",
            fontSize: "0.875rem",
            color: "#525252",
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
