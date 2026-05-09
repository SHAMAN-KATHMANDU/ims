import type { TabsProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function TabsBlock({ props }: BlockComponentProps<TabsProps>) {
  const tabs = props.tabs ?? [];

  return (
    <div style={{ marginBlock: "1rem" }}>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          borderBottom: "1px solid #ddd",
          marginBottom: "1rem",
        }}
      >
        {tabs.length === 0 ? (
          <div style={{ color: "#999", fontSize: "0.875rem" }}>
            Tabs (no tabs configured)
          </div>
        ) : (
          tabs.map((tab, i) => (
            <button
              key={i}
              style={{
                background: "none",
                border: "none",
                paddingBottom: "1rem",
                fontSize: "1rem",
                cursor: "pointer",
                borderBottom: i === 0 ? "2px solid #4a90e2" : "none",
                color: i === 0 ? "#4a90e2" : "#666",
              }}
            >
              {tab.label || "Tab"}
            </button>
          ))
        )}
      </div>
      {tabs[0] && (
        <div style={{ fontSize: "0.875rem", color: "#666" }}>
          {tabs[0].content || "Content"}
        </div>
      )}
    </div>
  );
}
