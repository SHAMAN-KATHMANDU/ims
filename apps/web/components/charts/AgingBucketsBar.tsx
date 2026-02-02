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
}

export function AgingBucketsBar({
  data,
  formatValue = formatCurrency,
  color = "hsl(var(--chart-1))",
}: AgingBucketsBarProps) {
  const config: ChartConfig = {
    value: { label: "Amount", color },
  };

  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
        No data
      </div>
    );
  }

  return (
    <ChartContainer config={config} className="w-full h-48">
      <BarChart data={data} layout="vertical" margin={{ left: 40, right: 12 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          className="stroke-muted"
          horizontal={false}
        />
        <XAxis type="number" tickFormatter={(v) => formatValue(Number(v))} />
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
  );
}
