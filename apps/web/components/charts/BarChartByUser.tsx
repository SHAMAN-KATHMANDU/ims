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
}

export function BarChartByUser({
  data,
  valueLabel,
  formatValue = formatCurrency,
  color = "hsl(var(--chart-1))",
}: BarChartByUserProps) {
  const config: ChartConfig = {
    value: { label: valueLabel, color },
  };

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">
        No data
      </div>
    );
  }

  return (
    <ChartContainer config={config} className="w-full h-64">
      <BarChart data={data} margin={{ left: 12, right: 12, bottom: 60 }}>
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
  );
}
