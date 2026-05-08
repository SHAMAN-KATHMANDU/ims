"use client";

import type { ReactNode, ComponentType, JSX } from "react";

type BtnVariant = "primary" | "secondary" | "ghost" | "accent" | "danger";
type BtnSize = "sm" | "md" | "lg";

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  children?: ReactNode;
  icon?: ComponentType<{ size: number; style?: React.CSSProperties }>;
  iconRight?: ComponentType<{ size: number; style?: React.CSSProperties }>;
  active?: boolean;
}

const sizeConfig: Record<BtnSize, { h: number; px: number; fs: number }> = {
  sm: { h: 24, px: 8, fs: 12 },
  md: { h: 28, px: 10, fs: 12.5 },
  lg: { h: 34, px: 14, fs: 13 },
};

const variantConfig: Record<
  BtnVariant,
  { bg: string; color: string; border: string }
> = {
  primary: { bg: "var(--ink)", color: "var(--bg)", border: "var(--ink)" },
  secondary: {
    bg: "var(--bg-elev)",
    color: "var(--ink)",
    border: "var(--line)",
  },
  ghost: { bg: "transparent", color: "var(--ink-2)", border: "transparent" },
  accent: {
    bg: "var(--accent)",
    color: "var(--accent-ink)",
    border: "var(--accent)",
  },
  danger: { bg: "transparent", color: "var(--danger)", border: "var(--line)" },
};

export function Btn({
  variant = "secondary",
  size = "md",
  children,
  icon: Icon,
  iconRight: IconRight,
  active = false,
  style,
  ...rest
}: BtnProps): JSX.Element {
  const sz = sizeConfig[size];
  const variant_active =
    active && variant === "ghost"
      ? "var(--bg-active)"
      : variantConfig[variant].bg;
  const v = {
    ...variantConfig[variant],
    bg: variant_active,
  };

  return (
    <button
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: sz.h,
        padding: `0 ${sz.px}px`,
        fontSize: sz.fs,
        background: v.bg,
        color: v.color,
        border: `1px solid ${v.border}`,
        borderRadius: 6,
        fontWeight: 500,
        whiteSpace: "nowrap",
        transition: "background 80ms",
        ...(style || {}),
      }}
    >
      {Icon && <Icon size={14} />}
      {children}
      {IconRight && <IconRight size={14} />}
    </button>
  );
}
