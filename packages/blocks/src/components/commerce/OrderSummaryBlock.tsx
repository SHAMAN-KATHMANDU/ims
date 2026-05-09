import type { OrderSummaryProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function OrderSummaryBlock({
  props,
}: BlockComponentProps<OrderSummaryProps>) {
  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "1rem auto",
        padding: "1rem",
        border: "1px solid #ddd",
        borderRadius: "8px",
      }}
    >
      <h3
        style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}
      >
        Order Summary
      </h3>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "0.5rem",
        }}
      >
        <span>Subtotal</span>
        <span>—</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "0.5rem",
        }}
      >
        <span>Shipping</span>
        <span>—</span>
      </div>
      <hr
        style={{
          margin: "1rem 0",
          border: "none",
          borderTop: "1px solid #ddd",
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "1.125rem",
          fontWeight: 600,
        }}
      >
        <span>Total</span>
        <span>—</span>
      </div>
    </div>
  );
}
