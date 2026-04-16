"use client";

/**
 * tabs block — general-purpose tabbed content panels.
 *
 * Tab content is stored as markdown strings in the schema and rendered
 * via the existing MarkdownBody component. Client component because the
 * active tab is interactive state.
 */

import { useState } from "react";
import type { TabsProps } from "@repo/shared";
import { MarkdownBody } from "@/components/blog/MarkdownBody";
import type { BlockComponentProps } from "../registry";

export function TabsBlock({ props }: BlockComponentProps<TabsProps>) {
  const [active, setActive] = useState(props.defaultTab ?? 0);

  if (props.tabs.length === 0) return null;

  const safeActive = Math.min(active, props.tabs.length - 1);
  const current = props.tabs[safeActive];

  return (
    <div style={{ padding: "1rem 0" }}>
      {/* Tab triggers */}
      <div
        style={{
          display: "flex",
          gap: "0.25rem",
          borderBottom: "1px solid var(--color-border)",
          marginBottom: "1.5rem",
          overflowX: "auto",
        }}
      >
        {props.tabs.map((tab, i) => {
          const isActive = i === safeActive;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              style={{
                padding: "0.75rem 1.25rem",
                fontSize: "0.9rem",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "var(--color-text)" : "var(--color-muted)",
                background: "transparent",
                border: "none",
                borderBottom: isActive
                  ? "2px solid var(--color-primary)"
                  : "2px solid transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "color 0.15s, border-color 0.15s",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active tab content */}
      {current && (
        <div
          style={{
            lineHeight: 1.65,
            color: "var(--color-text)",
          }}
        >
          <MarkdownBody source={current.content} />
        </div>
      )}
    </div>
  );
}
