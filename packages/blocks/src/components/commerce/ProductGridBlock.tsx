import type { ProductGridProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";
import { normalizeImageRef } from "../../utils/image";
import { formatPrice } from "../../utils/format";

export function ProductGridBlock({
  props,
  dataContext,
}: BlockComponentProps<ProductGridProps>) {
  const products = dataContext.products || [];
  const columns = props.columns ?? 3;
  const { locale = "en-IN", currency = "INR" } = dataContext.site || {};

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: "1rem",
        marginBlock: "1rem",
      }}
    >
      {products.length === 0 ? (
        <div
          style={{ color: "#999", fontSize: "0.875rem", gridColumn: "1 / -1" }}
        >
          Product Grid (no products)
        </div>
      ) : (
        products.map((product) => (
          <div
            key={product.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              overflow: "hidden",
              padding: "1rem",
            }}
          >
            <div
              style={{
                aspectRatio: "1",
                backgroundColor: "#f0f0f0",
                borderRadius: "4px",
                marginBottom: "1rem",
              }}
            />
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                marginBottom: "0.5rem",
              }}
            >
              {product.name}
            </h3>
            <p style={{ fontSize: "1.125rem", color: "#4a90e2" }}>
              {formatPrice(product.price, { locale, currency })}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
