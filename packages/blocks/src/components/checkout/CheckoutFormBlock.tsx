"use client";

import type { CheckoutFormProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function CheckoutFormBlock({
  props,
}: BlockComponentProps<CheckoutFormProps>) {
  return (
    <div
      style={{
        padding: "1.5rem",
        borderRadius: "8px",
        backgroundColor: "#f9f9f9",
        textAlign: "center",
        color: "#666",
      }}
    >
      <p style={{ margin: 0, fontSize: "1rem" }}>
        Checkout form block — rendered by tenant-site
      </p>
      {props.submitButtonLabel && (
        <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem" }}>
          Button: {props.submitButtonLabel}
        </p>
      )}
    </div>
  );
}
