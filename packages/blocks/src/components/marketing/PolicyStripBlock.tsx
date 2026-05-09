import type { PolicyStripProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function PolicyStripBlock({
  props,
}: BlockComponentProps<PolicyStripProps>) {
  const items = props.items ?? [];
  return (
    <div
      style={{
        padding: "1.5rem",
        backgroundColor: props.dark ? "#1a1a1a" : "#f0f0f0",
        color: props.dark ? "#fafafa" : "#1a1a1a",
        borderRadius: "8px",
        marginBlock: "1rem",
      }}
    >
      {props.heading ? (
        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>
          {props.heading}
        </h3>
      ) : null}
      <div
        style={{
          display: props.layout === "grid" ? "grid" : "flex",
          gridTemplateColumns:
            props.layout === "grid"
              ? `repeat(${props.columns ?? 3}, 1fr)`
              : undefined,
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        {items.length === 0 ? (
          <span style={{ color: "#999", fontSize: "0.875rem" }}>
            Policy strip — add items
          </span>
        ) : (
          items.map((item, i) => (
            <div key={i} style={{ fontSize: "0.875rem", lineHeight: 1.5 }}>
              <strong>{item.label}</strong>
              {item.detail ? (
                <div style={{ opacity: 0.7 }}>{item.detail}</div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
