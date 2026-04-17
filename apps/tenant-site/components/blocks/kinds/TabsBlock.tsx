"use client";

/**
 * tabs block — general-purpose tabbed content panels.
 *
 * Tab content is stored as markdown strings in the schema and rendered
 * via the existing MarkdownBody component. Client component because the
 * active tab is interactive state.
 */

import { useId, useRef, useState } from "react";
import type { TabsProps } from "@repo/shared";
import { MarkdownBody } from "@/components/blog/MarkdownBody";
import type { BlockComponentProps } from "../registry";

export function TabsBlock({ props }: BlockComponentProps<TabsProps>) {
  const [active, setActive] = useState(props.defaultTab ?? 0);
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  if (props.tabs.length === 0) return null;

  const safeActive = Math.min(active, props.tabs.length - 1);
  const current = props.tabs[safeActive];

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = (i + 1) % props.tabs.length;
      setActive(next);
      tabRefs.current[next]?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = (i - 1 + props.tabs.length) % props.tabs.length;
      setActive(prev);
      tabRefs.current[prev]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
      tabRefs.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      const last = props.tabs.length - 1;
      setActive(last);
      tabRefs.current[last]?.focus();
    }
  };

  return (
    <div style={{ padding: "1rem 0" }}>
      {/* Tab triggers */}
      <div
        role="tablist"
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
          const tabId = `${baseId}-tab-${i}`;
          const panelId = `${baseId}-panel-${i}`;
          return (
            <button
              key={i}
              id={tabId}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={(e) => onKeyDown(e, i)}
              style={{
                padding: "0.85rem 1.25rem",
                minHeight: 44,
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
          role="tabpanel"
          id={`${baseId}-panel-${safeActive}`}
          aria-labelledby={`${baseId}-tab-${safeActive}`}
          tabIndex={0}
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
