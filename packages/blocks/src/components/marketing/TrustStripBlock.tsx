import type { TrustStripProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function TrustStripBlock({
  props,
}: BlockComponentProps<TrustStripProps>) {
  const items =
    props.items && props.items.length > 0
      ? props.items
      : [
          { value: "Free Shipping", label: "On orders over $50" },
          { value: "Premium Quality", label: "Hand-checked goods" },
          { value: "Easy Returns", label: "30-day window" },
        ];

  return (
    <div
      style={{
        display: props.layout === "grid" ? "grid" : "flex",
        gridTemplateColumns:
          props.layout === "grid"
            ? `repeat(${props.columns ?? items.length}, 1fr)`
            : undefined,
        justifyContent: "space-around",
        alignItems: "center",
        gap: "1rem",
        padding: "2rem 1rem",
        backgroundColor: props.dark ? "#1a1a1a" : "#f9f9f9",
        color: props.dark ? "#fafafa" : "#1a1a1a",
        borderRadius: "8px",
        marginBlock: "1rem",
      }}
    >
      {items.map((item, i) => (
        <div key={i} style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "0.25rem",
            }}
          >
            {item.value}
          </div>
          <div style={{ fontSize: "0.875rem", opacity: 0.7 }}>{item.label}</div>
        </div>
      ))}
    </div>
  );
}
