import type { FbtProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function FbtBlock({
  props,
  dataContext,
}: BlockComponentProps<FbtProps>) {
  const products = dataContext.products || [];

  return (
    <div style={{ marginBlock: "1rem" }}>
      <h3
        style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}
      >
        Frequently Bought Together
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
        }}
      >
        {products.slice(0, 3).map((product) => (
          <div
            key={product.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "1rem",
            }}
          >
            <div
              style={{
                aspectRatio: "1",
                backgroundColor: "#f0f0f0",
                borderRadius: "4px",
                marginBottom: "0.5rem",
              }}
            />
            <p style={{ fontSize: "0.875rem", margin: 0 }}>{product.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
