"use client";

/**
 * Horizontal bar chart for aging buckets (e.g. credit 0-7, 8-30, 30+ days).
 */

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { formatCurrency } from "@/lib/format";

export interface AgingBucket {
  bucket: string;
  value: number;
}

interface AgingBucketsBarProps {
  data: AgingBucket[];
  formatValue?: (n: number) => string;
  color?: string;
  xLabel?: string;
  yLabel?: string;
  ariaLabel?: string;
  scale?: "linear" | "log";
}

export function AgingBucketsBar({
  data,
  formatValue = formatCurrency,
  color = "hsl(var(--chart-1))",
  xLabel = "Amount",
  yLabel = "Bucket",
  ariaLabel = "Aging buckets bar chart",
  scale = "linear",
}: AgingBucketsBarProps) {
  const config: ChartConfig = {
    value: { label: "Amount", color },
  };

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
        className="flex h-32 items-center justify-center text-muted-foreground text-sm"
        aria-label={ariaLabel}
      >
        No data
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full" aria-label={ariaLabel}>
      <div className="text-xs text-muted-foreground mb-1">{xLabel}</div>
      <ChartContainer
        config={config}
        className="min-w-0 w-full max-w-full h-48"
      >
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ left: 40, right: 12 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-muted"
            horizontal={false}
          />
          <XAxis
            type="number"
            scale={scale}
            domain={scale === "log" ? ["auto", "auto"] : undefined}
            tickFormatter={(v) => formatValue(Number(v))}
          />
          <YAxis type="category" dataKey="bucket" width={60} tickLine={false} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(v) => formatValue(Number(v))}
                labelKey="bucket"
              />
            }
          />
          <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ChartContainer>
      <div className="text-xs text-muted-foreground mt-1 text-center">
        {yLabel}
      </div>
    </div>
  );
}
