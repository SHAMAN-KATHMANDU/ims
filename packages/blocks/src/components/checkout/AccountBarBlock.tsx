import type { AccountBarProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function AccountBarBlock({
  props,
}: BlockComponentProps<AccountBarProps>) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1.5rem",
        backgroundColor: "#f9f9f9",
        borderRadius: "8px",
        marginBlock: "1rem",
      }}
    >
      <div>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "#666" }}>
          Logged in as
        </p>
        <p style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
          user@example.com
        </p>
      </div>
      <button
        style={{
          padding: "0.5rem 1rem",
          backgroundColor: "transparent",
          color: "#4a90e2",
          border: "2px solid #4a90e2",
          borderRadius: "4px",
          cursor: "pointer",
        }}
        disabled
      >
        Switch Account
      </button>
    </div>
  );
}
