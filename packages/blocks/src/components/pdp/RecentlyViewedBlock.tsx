import type { RecentlyViewedProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function RecentlyViewedBlock({
  props,
  dataContext,
}: BlockComponentProps<RecentlyViewedProps>) {
  const products = dataContext.products || [];

  return (
    <div style={{ marginBlock: "1rem" }}>
      <h3
        style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}
      >
        Recently Viewed
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "1rem",
        }}
      >
        {products.slice(0, 5).map((product) => (
          <div
            key={product.id}
            style={{
              aspectRatio: "1",
              backgroundColor: "#f0f0f0",
              borderRadius: "8px",
            }}
          />
        ))}
      </div>
    </div>
  );
}
