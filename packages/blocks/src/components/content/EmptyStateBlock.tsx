import type { EmptyStateProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function EmptyStateBlock({
  props,
}: BlockComponentProps<EmptyStateProps>) {
  return (
    <div
      style={{
        padding: "3rem 1rem",
        textAlign: "center",
        backgroundColor: "#f9f9f9",
        borderRadius: "8px",
        marginBlock: "1rem",
      }}
    >
      <div
        style={{
          fontSize: "2rem",
          marginBottom: "1rem",
        }}
      >
        {props.illustration !== "none" ? "∅" : ""}
      </div>
      <h3
        style={{
          fontSize: "1.25rem",
          color: "#1a1a2e",
          marginBottom: "0.5rem",
        }}
      >
        {props.heading || "Nothing here"}
      </h3>
      {props.subtitle && (
        <p style={{ color: "#666", marginBottom: "1rem" }}>{props.subtitle}</p>
      )}
    </div>
  );
}
