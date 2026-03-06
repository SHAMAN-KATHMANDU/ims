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

/** Snap percentage 0–100 to nearest 5 for data-width (avoids inline styles). */
export function snapWidthPercent(
  v: number,
  mx: number,
):
  | 0
  | 5
  | 10
  | 15
  | 20
  | 25
  | 30
  | 35
  | 40
  | 45
  | 50
  | 55
  | 60
  | 65
  | 70
  | 75
  | 80
  | 85
  | 90
  | 95
  | 100 {
  const pct = Math.min(100, Math.round((v / mx) * 100));
  const buckets = [
    0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90,
    95, 100,
  ] as const;
  return buckets.reduce((a, b) =>
    Math.abs(pct - a) <= Math.abs(pct - b) ? a : b,
  );
}

/** Map hex color to data-color key for CSS classes (avoids inline styles). */
export function colorToDataKey(hex: string | undefined): string {
  if (!hex) return "text";
  const map: Record<string, string> = {
    [C.accent]: "accent",
    [C.thamel]: "thamel",
    [C.gongabu]: "gongabu",
    [C.rubys]: "rubys",
    [C.online]: "online",
    [C.teal]: "teal",
    [C.red]: "red",
    [C.gold]: "gold",
    [C.tm]: "tm",
    [C.text]: "text",
  };
  return map[hex] ?? "text";
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
  color: C.text,
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
  .analytics-tooltip{background:#1c2333;border:1px solid ${C.border};border-radius:8px;font-size:12px;padding:10px 14px;color:${C.text}}
  .analytics-tooltip-label{font-weight:600;color:${C.text};margin-bottom:6px}
  .analytics-tooltip-row{margin-bottom:2px}
  .analytics-tooltip-row[data-color="accent"]{color:${C.accent}}
  .analytics-tooltip-row[data-color="thamel"]{color:${C.thamel}}
  .analytics-tooltip-row[data-color="gongabu"]{color:${C.gongabu}}
  .analytics-tooltip-row[data-color="rubys"]{color:${C.rubys}}
  .analytics-tooltip-row[data-color="online"]{color:${C.online}}
  .analytics-tooltip-row[data-color="teal"]{color:${C.teal}}
  .analytics-tooltip-row[data-color="red"]{color:${C.red}}
  .analytics-tooltip-row[data-color="gold"]{color:${C.gold}}
  .analytics-tooltip-row[data-color="text"]{color:${C.text}}
  .analytics-legend-dot{width:8px;height:8px;border-radius:9999px;flex-shrink:0}
  .analytics-legend-dot[data-color="gongabu"]{background-color:${C.gongabu}}
  .analytics-legend-dot[data-color="thamel"]{background-color:${C.thamel}}
  .analytics-legend-dot[data-color="online"]{background-color:${C.online}}
  .analytics-legend-dot[data-color="teal"]{background-color:${C.teal}}
  .analytics-legend-dot[data-color="gold"]{background-color:${C.gold}}
  .analytics-legend-dot[data-color="rubys"]{background-color:${C.rubys}}
  .analytics-legend-dot[data-color="red"]{background-color:${C.red}}
  .analytics-legend-dot[data-color="tm"]{background-color:${C.tm}}
  .analytics-value[data-color="accent"]{color:${C.accent}}
  .analytics-value[data-color="thamel"]{color:${C.thamel}}
  .analytics-value[data-color="gongabu"]{color:${C.gongabu}}
  .analytics-value[data-color="rubys"]{color:${C.rubys}}
  .analytics-value[data-color="online"]{color:${C.online}}
  .analytics-value[data-color="teal"]{color:${C.teal}}
  .analytics-value[data-color="red"]{color:${C.red}}
  .analytics-value[data-color="gold"]{color:${C.gold}}
  .analytics-value[data-color="text"]{color:${C.text}}
  .analytics-bar{height:100%;background-color:var(--bar-color);width:var(--bar-width,0%);border-radius:4px;min-width:2px}
  [data-heatmap="accent"][data-opacity="0"]{background:transparent}
  [data-heatmap="green"][data-opacity="0"]{background:rgba(63,185,80,0)}
  [data-heatmap="green"][data-opacity="1"]{background:rgba(63,185,80,0.04)}
  [data-heatmap="green"][data-opacity="2"]{background:rgba(63,185,80,0.08)}
  [data-heatmap="green"][data-opacity="3"]{background:rgba(63,185,80,0.12)}
  [data-heatmap="green"][data-opacity="4"]{background:rgba(63,185,80,0.16)}
  [data-heatmap="green"][data-opacity="5"]{background:rgba(63,185,80,0.2)}
  [data-heatmap="green"][data-opacity="6"]{background:rgba(63,185,80,0.24)}
  [data-heatmap="green"][data-opacity="7"]{background:rgba(63,185,80,0.28)}
  [data-heatmap="green"][data-opacity="8"]{background:rgba(63,185,80,0.32)}
  [data-heatmap="green"][data-opacity="9"]{background:rgba(63,185,80,0.36)}
  [data-heatmap="green"][data-opacity="10"]{background:rgba(63,185,80,0.4)}
  [data-heatmap="accent"][data-opacity="1"]{background:rgba(201,136,90,0.08)}
  [data-heatmap="accent"][data-opacity="2"]{background:rgba(201,136,90,0.16)}
  [data-heatmap="accent"][data-opacity="3"]{background:rgba(201,136,90,0.24)}
  [data-heatmap="accent"][data-opacity="4"]{background:rgba(201,136,90,0.32)}
  [data-heatmap="accent"][data-opacity="5"]{background:rgba(201,136,90,0.4)}
  [data-heatmap="accent"][data-opacity="6"]{background:rgba(201,136,90,0.48)}
  [data-heatmap="accent"][data-opacity="7"]{background:rgba(201,136,90,0.56)}
  [data-heatmap="accent"][data-opacity="8"]{background:rgba(201,136,90,0.64)}
  [data-heatmap="accent"][data-opacity="9"]{background:rgba(201,136,90,0.72)}
  [data-heatmap="accent"][data-opacity="10"]{background:rgba(201,136,90,0.8)}
  .analytics-progress-track{height:0.375rem;width:100%;border-radius:9999px;overflow:hidden;background-color:${C.border}}
  .analytics-progress-fill{height:100%;border-radius:inherit;transition:width 0.2s;min-width:2px}
  .analytics-progress-fill[data-color="accent"]{background-color:${C.accent}}
  .analytics-progress-fill[data-color="thamel"]{background-color:${C.thamel}}
  .analytics-progress-fill[data-color="gongabu"]{background-color:${C.gongabu}}
  .analytics-progress-fill[data-color="rubys"]{background-color:${C.rubys}}
  .analytics-progress-fill[data-color="online"]{background-color:${C.online}}
  .analytics-progress-fill[data-color="teal"]{background-color:${C.teal}}
  .analytics-progress-fill[data-color="red"]{background-color:${C.red}}
  .analytics-progress-fill[data-color="gold"]{background-color:${C.gold}}
  .analytics-progress-fill[data-color="primary"]{background-color:var(--primary)}
  .analytics-progress-fill[data-width="0"]{width:0%}
  .analytics-progress-fill[data-width="5"]{width:5%}
  .analytics-progress-fill[data-width="10"]{width:10%}
  .analytics-progress-fill[data-width="15"]{width:15%}
  .analytics-progress-fill[data-width="20"]{width:20%}
  .analytics-progress-fill[data-width="25"]{width:25%}
  .analytics-progress-fill[data-width="30"]{width:30%}
  .analytics-progress-fill[data-width="35"]{width:35%}
  .analytics-progress-fill[data-width="40"]{width:40%}
  .analytics-progress-fill[data-width="45"]{width:45%}
  .analytics-progress-fill[data-width="50"]{width:50%}
  .analytics-progress-fill[data-width="55"]{width:55%}
  .analytics-progress-fill[data-width="60"]{width:60%}
  .analytics-progress-fill[data-width="65"]{width:65%}
  .analytics-progress-fill[data-width="70"]{width:70%}
  .analytics-progress-fill[data-width="75"]{width:75%}
  .analytics-progress-fill[data-width="80"]{width:80%}
  .analytics-progress-fill[data-width="85"]{width:85%}
  .analytics-progress-fill[data-width="90"]{width:90%}
  .analytics-progress-fill[data-width="95"]{width:95%}
  .analytics-progress-fill[data-width="100"]{width:100%}
`;

/** Mono font family string */
export const MONO_FONT =
  "'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', monospace";

// Need React import for CSSProperties type
import type React from "react";
