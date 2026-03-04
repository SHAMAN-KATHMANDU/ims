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
  return (
    <div className="analytics-tooltip">
      <div className="analytics-tooltip-label">{label}</div>
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
