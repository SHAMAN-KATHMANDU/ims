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
}

export function TimeSeriesLineChart({
  data,
  series,
  xKey = "date",
  height = 300,
  formatValue = formatCurrency,
}: TimeSeriesLineChartProps) {
  const config: ChartConfig = {};
  series.forEach((s) => {
    config[s.dataKey] = { label: s.label, color: s.color };
  });

  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <LineChart data={data} margin={{ left: 12, right: 12 }}>
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
  );
}
