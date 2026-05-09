import type { StatsBandProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function StatsBandBlock({ props }: BlockComponentProps<StatsBandProps>) {
  const stats =
    props.items && props.items.length > 0
      ? props.items
      : [
          { value: "1M+", label: "Customers" },
          { value: "500+", label: "Products" },
          { value: "99%", label: "Satisfied" },
        ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
        gap: "2rem",
        padding: "2rem",
        backgroundColor: "#f9f9f9",
        borderRadius: "8px",
        textAlign: "center",
        marginBlock: "1rem",
      }}
    >
      {stats.map((stat, i) => (
        <div key={i}>
          <div
            style={{ fontSize: "2.5rem", fontWeight: 700, color: "#4a90e2" }}
          >
            {stat.value}
          </div>
          <div
            style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.5rem" }}
          >
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
