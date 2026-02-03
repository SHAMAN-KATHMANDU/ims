"use client";

/**
 * Multi-line time series using Recharts. Config-driven so same component works for gross/net/discount or other series.
 */

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { formatCurrency } from "@/lib/format";

export interface TimeSeriesLineSeries {
  dataKey: string;
  label: string;
  color: string;
}

interface TimeSeriesLineChartProps {
  data: Array<Record<string, unknown>>;
  series: TimeSeriesLineSeries[];
  xKey?: string;
  height?: number;
  formatValue?: (n: number) => string;
  xLabel?: string;
  yLabel?: string;
  ariaLabel?: string;
  scale?: "linear" | "log";
}

const MIN_POSITIVE = 1e-6;

export function TimeSeriesLineChart({
  data,
  series,
  xKey = "date",
  height = 300,
  formatValue = formatCurrency,
  xLabel = "Date",
  yLabel = "Amount",
  ariaLabel = "Time series line chart",
  scale = "linear",
}: TimeSeriesLineChartProps) {
  const config: ChartConfig = {};
  series.forEach((s) => {
    config[s.dataKey] = { label: s.label, color: s.color };
  });

  const chartData =
    scale === "log"
      ? data.map((row) => {
          const out: Record<string, unknown> = { ...row };
          series.forEach((s) => {
            const v = Number(row[s.dataKey] ?? 0);
            out[s.dataKey] = v <= 0 ? MIN_POSITIVE : v;
          });
          return out;
        })
      : data;

  return (
    <div className="min-w-0 w-full" aria-label={ariaLabel}>
      <div className="text-xs text-muted-foreground mb-1">{yLabel}</div>
      <ChartContainer
        config={config}
        className="min-w-0 w-full max-w-full"
        style={{ height }}
      >
        <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(v) => {
              const d = String(v);
              return d.length > 10 ? d.slice(0, 7) : d;
            }}
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
                labelFormatter={(v) => String(v)}
              />
            }
          />
          {series.map((s) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
      <div className="text-xs text-muted-foreground mt-1 text-center">
        {xLabel}
      </div>
    </div>
  );
}
