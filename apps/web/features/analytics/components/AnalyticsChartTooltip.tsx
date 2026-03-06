"use client";

import {
  fN,
  colorToDataKey,
  type ChartTooltipProps,
  type ChartTooltipPayloadItem,
} from "./reportTheme";

export function AnalyticsChartTooltip({
  active,
  payload,
  label,
}: ChartTooltipProps) {
  if (!active || !payload) return null;
  // Pie charts often pass undefined label; use first payload name as fallback
  const displayLabel = label ?? payload[0]?.name;
  return (
    <div className="analytics-tooltip">
      {displayLabel && (
        <div className="analytics-tooltip-label">{displayLabel}</div>
      )}
      {payload.map((p: ChartTooltipPayloadItem, i: number) => (
        <div
          key={i}
          className="analytics-tooltip-row"
          data-color={colorToDataKey(p.color)}
        >
          {p.name}: {typeof p.value === "number" ? fN(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}
