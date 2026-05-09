import type { UtilityBarProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function UtilityBarBlock({
  props,
}: BlockComponentProps<UtilityBarProps>) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: "1.5rem",
        padding: "0.5rem 1rem",
        backgroundColor: "#f9f9f9",
        fontSize: "0.875rem",
      }}
    >
      <a
        href="#"
        style={{
          color: "#666",
          textDecoration: "none",
        }}
      >
        Account
      </a>
      <a
        href="#"
        style={{
          color: "#666",
          textDecoration: "none",
        }}
      >
        Cart (0)
      </a>
      <a
        href="#"
        style={{
          color: "#666",
          textDecoration: "none",
        }}
      >
        Search
      </a>
    </div>
  );
}
