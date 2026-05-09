import type { SizeGuideProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function SizeGuideBlock({ props }: BlockComponentProps<SizeGuideProps>) {
  return (
    <div
      style={{
        marginBlock: "1rem",
        padding: "1rem",
        border: "1px solid #ddd",
        borderRadius: "8px",
      }}
    >
      <h3
        style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}
      >
        Size Guide
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
            <th style={{ padding: "0.5rem", textAlign: "left" }}>Size</th>
            <th style={{ padding: "0.5rem", textAlign: "left" }}>Width</th>
            <th style={{ padding: "0.5rem", textAlign: "left" }}>Length</th>
          </tr>
        </thead>
        <tbody>
          {["XS", "S", "M", "L", "XL"].map((size) => (
            <tr key={size} style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: "0.5rem" }}>{size}</td>
              <td style={{ padding: "0.5rem" }}>—</td>
              <td style={{ padding: "0.5rem" }}>—</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
