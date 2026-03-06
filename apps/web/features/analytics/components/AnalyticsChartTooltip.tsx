"use client";

import type { CSSProperties } from "react";
import {
  C,
  fN,
  colorToDataKey,
  type ChartTooltipProps,
  type ChartTooltipPayloadItem,
} from "./reportTheme";

/** Inline tooltip styles — ensure readable contrast regardless of global CSS loading or Recharts portal. */
const tooltipContainerStyle: CSSProperties = {
  background: "#1c2333",
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  fontSize: 12,
  padding: "10px 14px",
  color: C.text,
};

const tooltipLabelStyle: CSSProperties = {
  fontWeight: 600,
  marginBottom: 6,
};

export function AnalyticsChartTooltip({
  active,
  payload,
  label,
}: ChartTooltipProps) {
  if (!active || !payload) return null;
  // Pie charts often pass undefined label; use first payload name as fallback
  const displayLabel = label ?? payload[0]?.name;
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
          style={{ color: p.color ?? C.text, marginBottom: 2 }}
        >
          {p.name}: {typeof p.value === "number" ? fN(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}
