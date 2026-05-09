import type { CategoryTilesProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function CategoryTilesBlock({
  props,
  dataContext,
}: BlockComponentProps<CategoryTilesProps>) {
  const categories = dataContext.categories || [];
  const columns = props.columns ?? 3;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: "1rem",
        marginBlock: "1rem",
      }}
    >
      {categories.length === 0 ? (
        <div
          style={{ color: "#999", fontSize: "0.875rem", gridColumn: "1 / -1" }}
        >
          Category Tiles (no categories)
        </div>
      ) : (
        categories.map((cat) => (
          <div
            key={cat.id}
            style={{
              position: "relative",
              aspectRatio: "1",
              backgroundColor: "#f0f0f0",
              borderRadius: "8px",
              overflow: "hidden",
              display: "flex",
              alignItems: "flex-end",
              padding: "1rem",
              cursor: "pointer",
            }}
          >
            <h3
              style={{
                color: "#fff",
                fontSize: "1.125rem",
                fontWeight: 600,
                textShadow: "0 2px 4px rgba(0,0,0,0.3)",
              }}
            >
              {cat.name}
            </h3>
          </div>
        ))
      )}
    </div>
  );
}
