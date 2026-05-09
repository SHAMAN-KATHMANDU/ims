import type { ProductListingProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";
import { formatPrice } from "../../utils/format";

export function ProductListingBlock({
  props,
  dataContext,
}: BlockComponentProps<ProductListingProps>) {
  const products = dataContext.products || [];
  const { locale = "en-IN", currency = "INR" } = dataContext.site || {};

  return (
    <div style={{ marginBlock: "1rem" }}>
      {products.length === 0 ? (
        <div style={{ color: "#999", fontSize: "0.875rem" }}>
          Product Listing (no products)
        </div>
      ) : (
        products.map((product) => (
          <div
            key={product.id}
            style={{
              display: "flex",
              gap: "1rem",
              borderBottom: "1px solid #ddd",
              paddingBlock: "1rem",
            }}
          >
            <div
              style={{
                width: "100px",
                height: "100px",
                backgroundColor: "#f0f0f0",
                borderRadius: "4px",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>
                {product.name}
              </h3>
              <p
                style={{
                  fontSize: "1.125rem",
                  color: "#4a90e2",
                  margin: "0.5rem 0 0 0",
                }}
              >
                {formatPrice(product.price, { locale, currency })}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
