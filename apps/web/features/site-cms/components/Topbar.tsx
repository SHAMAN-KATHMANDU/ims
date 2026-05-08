"use client";

import { Bell, ExternalLink } from "lucide-react";
import { useBreadcrumbs } from "../hooks/use-breadcrumbs";
import type { JSX, ReactNode } from "react";

interface TopbarProps {
  right?: ReactNode;
}

export function Topbar({ right }: TopbarProps): JSX.Element {
  const { crumbs, subline, hidden } = useBreadcrumbs();

  if (hidden) {
    return <></>;
  }

  return (
    <div
      style={{
        height: 48,
        borderBottom: "1px solid var(--line)",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 12,
        flexShrink: 0,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {/* Breadcrumbs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flex: 1,
          minWidth: 0,
        }}
      >
        {crumbs.map((c, i) => (
          <div
            key={i}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            {i > 0 && (
              <span style={{ color: "var(--ink-5)", fontSize: 12 }}>/</span>
            )}
            <span
              style={{
                fontSize: 13,
                fontWeight: i === crumbs.length - 1 ? 600 : 450,
                color: i === crumbs.length - 1 ? "var(--ink)" : "var(--ink-3)",
                whiteSpace: "nowrap",
              }}
            >
              {c}
            </span>
          </div>
        ))}
        {subline && (
          <span
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-4)",
              marginLeft: 8,
            }}
          >
            {subline}
          </span>
        )}
      </div>

      {/* Right slot (page CTAs) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {right}

        {/* Bell button */}
        <button
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: "1px solid var(--line)",
            background: "var(--bg-elev)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink-3)",
            position: "relative",
          }}
        >
          <Bell size={14} />
          <span
            style={{
              position: "absolute",
              top: 5,
              right: 5,
              width: 6,
              height: 6,
              borderRadius: 999,
              background: "var(--accent)",
            }}
          />
        </button>

        {/* Live site button */}
        <button
          title="View live site"
          style={{
            height: 28,
            padding: "0 10px",
            borderRadius: 6,
            border: "1px solid var(--line)",
            background: "var(--bg-elev)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "var(--ink-2)",
            fontSize: 12,
          }}
        >
          <ExternalLink size={13} />
          Live site
        </button>
      </div>
    </div>
  );
}
