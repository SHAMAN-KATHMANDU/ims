import type { PdpRelatedProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function PdpRelatedBlock({
  props,
  dataContext,
}: BlockComponentProps<PdpRelatedProps>) {
  const products = dataContext.products || [];

  return (
    <div style={{ marginBlock: "1rem" }}>
      <h3
        style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}
      >
        Related Products
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem",
        }}
      >
        {products.slice(0, 4).map((product) => (
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
            <h4 style={{ fontSize: "0.875rem", margin: 0 }}>{product.name}</h4>
          </div>
        ))}
      </div>
    </div>
  );
}
