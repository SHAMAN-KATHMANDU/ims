"use client";

/**
 * Simple quadrant (scatter) chart using SVG. X = velocity, Y = quantity.
 * No Recharts; minimal CSS for Reports.
 */
import { useMemo } from "react";

export interface ReportsQuadrantPoint {
  name: string;
  velocity: number;
  quantity: number;
}

interface ReportsQuadrantChartProps {
  data: ReportsQuadrantPoint[];
  xLabel?: string;
  yLabel?: string;
  ariaLabel?: string;
  width?: number;
  height?: number;
}

export function ReportsQuadrantChart({
  data,
  xLabel = "Sales velocity",
  yLabel = "Stock quantity",
  ariaLabel = "Quadrant chart",
  width = 400,
  height = 260,
}: ReportsQuadrantChartProps) {
  const { points, padding } = useMemo(() => {
    const padding = { top: 20, right: 20, bottom: 36, left: 44 };
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;
    const xMax = Math.max(...data.map((d) => d.velocity), 1);
    const yMax = Math.max(...data.map((d) => d.quantity), 1);
    const points = data.map((d) => ({
      ...d,
      cx: padding.left + (d.velocity / xMax) * innerW,
      cy: padding.top + innerH - (d.quantity / yMax) * innerH,
    }));
    return { points, padding };
  }, [data, width, height]);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground text-sm w-[var(--chart-width)] h-[var(--chart-height)]"
        style={
          {
            "--chart-width": `${width}px`,
            "--chart-height": `${height}px`,
          } as React.CSSProperties
        }
        aria-label={ariaLabel}
      >
        No data
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto" aria-label={ariaLabel} role="img">
      <svg width={width} height={height} className="text-muted-foreground">
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="currentColor"
          strokeOpacity={0.3}
          strokeWidth={1}
        />
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="currentColor"
          strokeOpacity={0.3}
          strokeWidth={1}
        />
        {points.map((p) => (
          <g key={p.name}>
            <circle
              cx={p.cx}
              cy={p.cy}
              r={6}
              fill="#2563eb"
              stroke="#fff"
              strokeWidth={1}
            />
            <title>
              {p.name}: {xLabel}={p.velocity}, {yLabel}={p.quantity}
            </title>
          </g>
        ))}
        <text
          x={width / 2}
          y={height - 8}
          textAnchor="middle"
          className="fill-muted-foreground text-xs"
        >
          {xLabel}
        </text>
        <text
          x={12}
          y={height / 2}
          textAnchor="middle"
          className="fill-muted-foreground text-xs"
          transform={`rotate(-90, 12, ${height / 2})`}
        >
          {yLabel}
        </text>
      </svg>
    </div>
  );
}
