import type { ProductFiltersProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function ProductFiltersBlock({
  props,
}: BlockComponentProps<ProductFiltersProps>) {
  return (
    <div
      style={{
        padding: "1rem",
        backgroundColor: "#f9f9f9",
        borderRadius: "8px",
        marginBlock: "1rem",
      }}
    >
      <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>
        Filters
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <label style={{ fontSize: "0.875rem", display: "flex", gap: "0.5rem" }}>
          <input type="checkbox" disabled /> Price Range
        </label>
        <label style={{ fontSize: "0.875rem", display: "flex", gap: "0.5rem" }}>
          <input type="checkbox" disabled /> Category
        </label>
        <label style={{ fontSize: "0.875rem", display: "flex", gap: "0.5rem" }}>
          <input type="checkbox" disabled /> Availability
        </label>
      </div>
    </div>
  );
}
