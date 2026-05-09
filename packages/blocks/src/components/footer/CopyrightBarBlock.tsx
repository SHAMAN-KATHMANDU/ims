import type { CopyrightBarProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function CopyrightBarBlock({
  props,
}: BlockComponentProps<CopyrightBarProps>) {
  const year = new Date().getFullYear();

  return (
    <div
      style={{
        textAlign: "center",
        padding: "1.5rem",
        backgroundColor: "#000",
        color: "#999",
        fontSize: "0.875rem",
        borderTop: "1px solid #333",
      }}
    >
      <p style={{ margin: 0 }}>
        © {year} {props.copy || "All rights reserved."}
      </p>
    </div>
  );
}
