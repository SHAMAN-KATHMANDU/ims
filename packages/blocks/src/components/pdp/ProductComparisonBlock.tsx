import type { ProductComparisonProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function ProductComparisonBlock({
  props,
  dataContext,
}: BlockComponentProps<ProductComparisonProps>) {
  const products = dataContext.products || [];

  return (
    <div style={{ marginBlock: "1rem", overflowX: "auto" }}>
      <h3
        style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}
      >
        Compare Products
      </h3>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "0.875rem",
        }}
      >
        <thead>
          <tr style={{ borderBottom: "2px solid #ddd" }}>
            <th style={{ padding: "0.5rem", textAlign: "left" }}>Feature</th>
            {products.slice(0, 3).map((p) => (
              <th key={p.id} style={{ padding: "0.5rem", textAlign: "left" }}>
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {["Price", "Availability", "Rating"].map((feature) => (
            <tr key={feature} style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: "0.5rem" }}>{feature}</td>
              {products.slice(0, 3).map((p) => (
                <td key={p.id} style={{ padding: "0.5rem" }}>
                  —
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
