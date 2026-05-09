import type { FaqProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function FaqBlock({ props }: BlockComponentProps<FaqProps>) {
  const items = props.items || [];

  return (
    <div
      style={{
        maxWidth: "700px",
        margin: "1rem auto",
      }}
    >
      <h2 style={{ fontSize: "2rem", fontWeight: 600, marginBottom: "1.5rem" }}>
        {props.heading || "FAQ"}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {items.length === 0
          ? [{ q: "Question 1?", a: "Answer 1" }].map((item, i) => (
              <div
                key={i}
                style={{
                  borderBottom: "1px solid #ddd",
                  paddingBottom: "1rem",
                }}
              >
                <h4
                  style={{
                    margin: 0,
                    marginBottom: "0.5rem",
                    cursor: "pointer",
                  }}
                >
                  {item.q}
                </h4>
                <p style={{ margin: 0, color: "#666", fontSize: "0.875rem" }}>
                  {item.a}
                </p>
              </div>
            ))
          : items.map((item, i) => (
              <div
                key={i}
                style={{
                  borderBottom: "1px solid #ddd",
                  paddingBottom: "1rem",
                }}
              >
                <h4
                  style={{
                    margin: 0,
                    marginBottom: "0.5rem",
                    cursor: "pointer",
                  }}
                >
                  {item.question || "Q"}
                </h4>
                <p style={{ margin: 0, color: "#666", fontSize: "0.875rem" }}>
                  {item.answer || "A"}
                </p>
              </div>
            ))}
      </div>
    </div>
  );
}
