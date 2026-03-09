"use client";

import type { CSSProperties } from "react";
import {
  C,
  fN,
  colorToDataKey,
  type ChartTooltipProps,
  type ChartTooltipPayloadItem,
} from "./reportTheme";

/** Optional formatter for tooltip value: (value, name) => string. When not provided, numbers use fN(), else String(value). */
export type TooltipValueFormatter = (
  value: number | string,
  name?: string,
) => string;

/** Inline tooltip styles — ensure readable contrast regardless of global CSS loading or Recharts portal. */
const tooltipContainerStyle: CSSProperties = {
  background: "#1c2333",
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  fontSize: 12,
  padding: "10px 14px",
  color: C.text,
  boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06)",
};

const tooltipLabelStyle: CSSProperties = {
  fontWeight: 600,
  marginBottom: 6,
  color: C.text,
};

/** Use series color for row text; fall back to C.text so dim colors stay readable on dark tooltip. */
function tooltipRowColor(color: string | undefined): string {
  if (!color) return C.text;
  return color;
}

export interface AnalyticsChartTooltipProps extends ChartTooltipProps {
  /** Optional formatter for payload values. Default: fN for numbers, String otherwise. */
  formatter?: TooltipValueFormatter;
}

export function AnalyticsChartTooltip({
  active,
  payload,
  label,
  formatter,
}: AnalyticsChartTooltipProps) {
  if (!active || !payload) return null;
  // Pie charts often pass undefined label; use first payload name as fallback
  const displayLabel = label ?? payload[0]?.name;
  const formatValue = (p: ChartTooltipPayloadItem) => {
    const raw = Array.isArray(p.value) ? p.value[0] : p.value;
    return formatter
      ? formatter(
          raw as number | string,
          p.name != null ? String(p.name) : undefined,
        )
      : typeof raw === "number"
        ? fN(raw)
        : String(raw ?? "");
  };

  return (
    <div className="analytics-tooltip" style={tooltipContainerStyle}>
      {displayLabel && (
        <div className="analytics-tooltip-label" style={tooltipLabelStyle}>
          {displayLabel}
        </div>
      )}
      {payload.map((p: ChartTooltipPayloadItem, i: number) => (
        <div
          key={i}
          className="analytics-tooltip-row"
          data-color={colorToDataKey(p.color)}
          style={{
            color: tooltipRowColor(p.color),
            marginBottom: 2,
          }}
        >
          {p.name != null ? String(p.name) : ""}: {formatValue(p)}
        </div>
      ))}
    </div>
  );
}
