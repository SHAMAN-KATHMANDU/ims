"use client";

import type { JSX } from "react";

type DotTone = "default" | "success" | "warn" | "danger" | "info" | "accent";

interface StatusDotProps {
  tone?: DotTone;
}

const colorMap: Record<DotTone, string> = {
  default: "var(--ink-4)",
  success: "var(--success)",
  warn: "var(--warn)",
  danger: "var(--danger)",
  info: "var(--info)",
  accent: "var(--accent)",
};

export function StatusDot({ tone = "default" }: StatusDotProps): JSX.Element {
  const color = colorMap[tone];

  return (
    <span
      style={{
        display: "inline-block",
        width: 6,
        height: 6,
        borderRadius: 999,
        background: color,
        boxShadow: `0 0 0 2px oklch(from ${color} l c h / 0.18)`,
      }}
    />
  );
}
