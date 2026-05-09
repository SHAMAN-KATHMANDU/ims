import type { GiftCardRedeemProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function GiftCardRedeemBlock({
  props,
}: BlockComponentProps<GiftCardRedeemProps>) {
  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "1rem auto",
        padding: "2rem",
        border: "2px solid #4a90e2",
        borderRadius: "8px",
        textAlign: "center",
      }}
    >
      <h3
        style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}
      >
        Redeem Gift Card
      </h3>
      <input
        type="text"
        placeholder="Enter gift card code"
        style={{
          width: "100%",
          padding: "0.75rem",
          border: "1px solid #ddd",
          borderRadius: "4px",
          marginBottom: "1rem",
          fontSize: "1rem",
        }}
        disabled
      />
      <button
        style={{
          width: "100%",
          padding: "0.75rem",
          backgroundColor: "#4a90e2",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontWeight: 500,
        }}
        disabled
      >
        Redeem
      </button>
    </div>
  );
}
