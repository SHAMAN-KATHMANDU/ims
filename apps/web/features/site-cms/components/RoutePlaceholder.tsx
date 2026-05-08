"use client";

import { useSetBreadcrumbs } from "../hooks/use-breadcrumbs";
import type { JSX } from "react";

interface RoutePlaceholderProps {
  name: string;
  phase?: string;
}

export function RoutePlaceholder({
  name,
  phase = "Phase 2",
}: RoutePlaceholderProps): JSX.Element {
  useSetBreadcrumbs(["Site", name]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        minHeight: "400px",
      }}
    >
      <div
        style={{
          textAlign: "center",
          color: "var(--ink-3)",
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 600,
            color: "var(--ink-4)",
            marginBottom: 8,
          }}
        >
          🏗️
        </div>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: "var(--ink)",
            marginBottom: 4,
          }}
        >
          {name} — Coming in {phase}
        </h2>
        <p style={{ fontSize: 14, color: "var(--ink-3)", maxWidth: 400 }}>
          This section is being built as part of the CMS shell rollout. Check
          back soon!
        </p>
      </div>
    </div>
  );
}
