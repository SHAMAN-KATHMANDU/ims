import type { CartLineItemsProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function CartLineItemsBlock({
  props,
}: BlockComponentProps<CartLineItemsProps>) {
  return (
    <div style={{ marginBlock: "1rem" }}>
      <h3
        style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}
      >
        Cart Items
      </h3>
      <div
        style={{
          backgroundColor: "#f9f9f9",
          padding: "1rem",
          borderRadius: "4px",
          textAlign: "center",
          color: "#999",
          fontSize: "0.875rem",
        }}
      >
        Your cart is empty
      </div>
    </div>
  );
}
