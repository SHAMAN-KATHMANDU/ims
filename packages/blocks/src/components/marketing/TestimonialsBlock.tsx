import type { TestimonialsProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function TestimonialsBlock({
  props,
}: BlockComponentProps<TestimonialsProps>) {
  const items =
    props.items && props.items.length > 0
      ? props.items
      : [
          { quote: "Great product!", author: "Customer 1" },
          { quote: "Highly recommended!", author: "Customer 2" },
          { quote: "Best experience!", author: "Customer 3" },
        ];

  const cols = props.columns ?? 3;

  return (
    <div style={{ marginBlock: "1rem" }}>
      <h2
        style={{
          fontSize: "2rem",
          fontWeight: 600,
          textAlign: "center",
          marginBottom: "2rem",
        }}
      >
        {props.heading || "What Our Customers Say"}
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: "1rem",
        }}
      >
        {items.map((t, i) => (
          <div
            key={i}
            style={{
              padding: "1rem",
              backgroundColor: "#f9f9f9",
              borderRadius: "8px",
            }}
          >
            <p
              style={{ margin: 0, marginBottom: "1rem", color: "#666" }}
            >{`"${t.quote}"`}</p>
            <p
              style={{
                margin: 0,
                fontWeight: 600,
                fontSize: "0.875rem",
              }}
            >
              — {t.author}
              {t.role ? (
                <span style={{ color: "#999", fontWeight: 400 }}>
                  {" "}
                  · {t.role}
                </span>
              ) : null}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
