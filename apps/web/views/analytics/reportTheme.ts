/**
 * Shared dark theme and colour palette for all analytics/reports pages.
 * Based on the reference dashboard design. Only used inside analytics views
 * so the rest of the app stays unchanged.
 */

/* ─── PALETTE ─── */
export const C = {
  bg: "#0d1117",
  card: "#161b22",
  border: "#30363d",
  text: "#e6edf3",
  /** text-muted */
  tm: "#8b949e",
  /** text-dim */
  td: "#656d76",
  accent: "#c9885a",
  thamel: "#58a6ff",
  gongabu: "#3fb950",
  rubys: "#d2a8ff",
  online: "#f0883e",
  teal: "#39d2c0",
  red: "#f85149",
  gold: "#e3b341",
} as const;

/** Ordered chart series colours for generic indexed access. */
export const CHART_COLORS = [
  C.accent,
  C.thamel,
  C.gongabu,
  C.rubys,
  C.online,
  C.teal,
  C.red,
  C.gold,
] as const;

export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length] ?? C.accent;
}

/* ─── NUMBER FORMATTERS ─── */

/** Format currency with compact suffix (e.g. NPR 1.25M, NPR 45K, NPR 1,200) */
export function fN(v: number): string {
  if (v >= 1e6) return `NPR ${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `NPR ${(v / 1e3).toFixed(0)}K`;
  return `NPR ${v.toLocaleString()}`;
}

/** Short number (e.g. 1.2M, 45K, 900) */
export function fS(v: number): string {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toString();
}

/** Percentage with 1 decimal */
export function fP(v: number): string {
  return `${v.toFixed(1)}%`;
}

/* ─── TOOLTIP TYPES (Recharts) ─── */

export interface ChartTooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  label?: string;
}

/* ─── CHART STYLE OBJECTS ─── */

/** Recharts tooltip container style */
export const tooltipStyle: React.CSSProperties = {
  background: "#1c2333",
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  fontSize: 12,
  padding: "10px 14px",
};

/** Recharts axis tick */
export const axisTick = { fill: C.tm, fontSize: 11 } as const;

/** Recharts CartesianGrid props */
export const gridProps = {
  strokeDasharray: "3 3",
  stroke: C.border,
} as const;

/* ─── SHARED CSS (injected once per page) ─── */
export const ANALYTICS_GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap');
  @keyframes analyticsFadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes analyticsFadeIn{from{opacity:0}to{opacity:1}}
  [data-analytics] .recharts-text{fill:${C.tm}!important;font-size:11px!important}
  [data-analytics] select:focus{border-color:${C.accent}}
  [data-analytics] select option{background:${C.card};color:${C.text}}
`;

/** Mono font family string */
export const MONO_FONT =
  "'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', monospace";

// Need React import for CSSProperties type
import type React from "react";
