import type { AccordionProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function AccordionBlock({ props }: BlockComponentProps<AccordionProps>) {
  const items = props.items ?? [];

  return (
    <div style={{ marginBlock: "1rem" }}>
      {items.length === 0 ? (
        <div style={{ color: "#999", fontSize: "0.875rem" }}>
          Accordion (no items configured)
        </div>
      ) : (
        items.map((item, i) => (
          <div
            key={i}
            style={{
              borderTop: "1px solid #ddd",
              paddingBlock: "1rem",
            }}
          >
            <button
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: 500,
                width: "100%",
                textAlign: "left",
                padding: 0,
              }}
            >
              {item.title || "Item"}
            </button>
            <div
              style={{
                marginTop: "0.5rem",
                fontSize: "0.875rem",
                color: "#666",
              }}
            >
              {item.body || "Content"}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
