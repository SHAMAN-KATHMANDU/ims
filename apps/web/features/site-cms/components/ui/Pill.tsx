"use client";

import { ReactNode } from "react";
import type { JSX } from "react";

type PillTone =
  | "default"
  | "success"
  | "warn"
  | "danger"
  | "info"
  | "accent"
  | "ghost";

interface PillProps {
  children: ReactNode;
  tone?: PillTone;
  mono?: boolean;
}

const toneStyles: Record<
  PillTone,
  { bg: string; color: string; border: string }
> = {
  default: {
    bg: "var(--bg-sunken)",
    color: "var(--ink-3)",
    border: "var(--line)",
  },
  success: {
    bg: "oklch(from var(--success) l c h / 0.12)",
    color: "var(--success)",
    border: "oklch(from var(--success) l c h / 0.3)",
  },
  warn: {
    bg: "oklch(from var(--warn) l c h / 0.14)",
    color: "var(--warn)",
    border: "oklch(from var(--warn) l c h / 0.3)",
  },
  danger: {
    bg: "oklch(from var(--danger) l c h / 0.12)",
    color: "var(--danger)",
    border: "oklch(from var(--danger) l c h / 0.3)",
  },
  info: {
    bg: "oklch(from var(--info) l c h / 0.12)",
    color: "var(--info)",
    border: "oklch(from var(--info) l c h / 0.3)",
  },
  accent: {
    bg: "var(--accent-soft)",
    color: "var(--accent)",
    border: "var(--accent-line)",
  },
  ghost: {
    bg: "transparent",
    color: "var(--ink-3)",
    border: "var(--line)",
  },
};

export function Pill({
  children,
  tone = "default",
  mono = true,
}: PillProps): JSX.Element {
  const style = toneStyles[tone];

  return (
    <span
      className={mono ? "mono" : ""}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "1px 6px",
        fontSize: 10.5,
        lineHeight: "16px",
        letterSpacing: 0.2,
        textTransform: "uppercase",
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        borderRadius: 4,
      }}
    >
      {children}
    </span>
  );
}
