import type { LogoCloudProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function LogoCloudBlock({ props }: BlockComponentProps<LogoCloudProps>) {
  const logos = props.logos || [];

  return (
    <div
      style={{
        padding: "2rem 1rem",
        backgroundColor: "#f9f9f9",
        borderRadius: "8px",
        marginBlock: "1rem",
      }}
    >
      <h3
        style={{
          textAlign: "center",
          fontSize: "0.875rem",
          color: "#999",
          marginBottom: "1rem",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {props.heading || "Trusted by"}
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${props.columns || 5}, 1fr)`,
          gap: "1rem",
          alignItems: "center",
        }}
      >
        {logos.length === 0
          ? [1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  height: "40px",
                  backgroundColor: "#ddd",
                  borderRadius: "4px",
                }}
              />
            ))
          : logos.map((logo, i) => (
              <div
                key={i}
                style={{
                  height: "40px",
                  backgroundColor: "#ddd",
                  borderRadius: "4px",
                }}
              />
            ))}
      </div>
    </div>
  );
}
