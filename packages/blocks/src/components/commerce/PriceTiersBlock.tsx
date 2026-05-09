import type { PriceTiersProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function PriceTiersBlock({
  props,
}: BlockComponentProps<PriceTiersProps>) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "1rem",
        marginBlock: "1rem",
      }}
    >
      {[
        { label: "Tier 1", price: "—" },
        { label: "Tier 2", price: "—" },
        { label: "Tier 3", price: "—" },
      ].map((tier, i) => (
        <div
          key={i}
          style={{
            padding: "1rem",
            border: i === 1 ? "2px solid #4a90e2" : "1px solid #ddd",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <h4
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              marginBottom: "0.5rem",
            }}
          >
            {tier.label}
          </h4>
          <p style={{ fontSize: "1.5rem", color: "#4a90e2", margin: 0 }}>
            {tier.price}
          </p>
        </div>
      ))}
    </div>
  );
}
