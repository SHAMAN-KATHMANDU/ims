import type { LogoMarkProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function LogoMarkBlock({ props }: BlockComponentProps<LogoMarkProps>) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "1rem 0",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          backgroundColor: "#4a90e2",
          borderRadius: "4px",
        }}
      />
      <div style={{ fontSize: "1.125rem", fontWeight: 700 }}>
        {props.brand || "Brand"}
      </div>
    </div>
  );
}
