"use client";

/**
 * Bar chart for user performance (revenue, count, or avg discount per user).
 */

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { formatCurrency } from "@/lib/format";

export interface UserBarItem {
  username: string;
  value: number;
  userId: string;
}

interface BarChartByUserProps {
  data: UserBarItem[];
  valueLabel: string;
  formatValue?: (n: number) => string;
  color?: string;
  xLabel?: string;
  yLabel?: string;
  ariaLabel?: string;
  scale?: "linear" | "log";
}

export function BarChartByUser({
  data,
  valueLabel,
  formatValue = formatCurrency,
  color = "hsl(var(--chart-1))",
  xLabel = "User",
  yLabel,
  ariaLabel,
  scale = "linear",
}: BarChartByUserProps) {
  const config: ChartConfig = {
    value: { label: valueLabel, color },
  };
  const yAxisLabel = yLabel ?? valueLabel;

  const chartData =
    scale === "log"
      ? data.map((d) => ({
          ...d,
          value: d.value <= 0 ? 1e-6 : d.value,
        }))
      : data;

  if (data.length === 0) {
    return (
      <div
        className="flex h-48 items-center justify-center text-muted-foreground text-sm"
        aria-label={ariaLabel ?? "Bar chart (no data)"}
      >
        No data
      </div>
    );
  }

  return (
    <div
      className="min-w-0 w-full"
      aria-label={ariaLabel ?? `Bar chart: ${valueLabel} by ${xLabel}`}
    >
      <div className="text-xs text-muted-foreground mb-1">{yAxisLabel}</div>
      <ChartContainer
        config={config}
        className="min-w-0 w-full max-w-full h-64"
      >
        <BarChart data={chartData} margin={{ left: 12, right: 12, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="username"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            type="number"
            scale={scale}
            domain={scale === "log" ? ["auto", "auto"] : undefined}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(v) => formatValue(Number(v))}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(v) => formatValue(Number(v))}
                labelKey="username"
              />
            }
          />
          <Bar
            dataKey="value"
            fill={color}
            radius={[4, 4, 0, 0]}
            name={valueLabel}
          />
        </BarChart>
      </ChartContainer>
      <div className="text-xs text-muted-foreground mt-1 text-center">
        {xLabel}
      </div>
    </div>
  );
}
