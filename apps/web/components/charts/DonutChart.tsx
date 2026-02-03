"use client";

/**
 * Donut chart for composition (by location, payment method, sale type). Single dimension at a time.
 */

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, Legend } from "recharts";
import { formatCurrency } from "@/lib/format";

export interface DonutSlice {
  name: string;
  value: number;
  id: string;
}

const DEFAULT_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface DonutChartProps {
  data: DonutSlice[];
  title?: string;
  formatValue?: (n: number) => string;
  colors?: string[];
}

export function DonutChart({
  data,
  title,
  formatValue = formatCurrency,
  colors = DEFAULT_COLORS,
}: DonutChartProps) {
  const config: ChartConfig = {};
  data.forEach((d, i) => {
    config[d.id] = { label: d.name, color: colors[i % colors.length] };
  });

  if (data.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center text-muted-foreground text-sm">
        No data
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && (
        <p className="text-sm font-medium text-muted-foreground mb-2">
          {title}
        </p>
      )}
      <ChartContainer config={config} className="w-full aspect-square">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            label={({ name, percent }) =>
              `${name} ${(percent * 100).toFixed(0)}%`
            }
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(v) => formatValue(Number(v))}
                nameKey="name"
              />
            }
          />
          <Legend />
        </PieChart>
      </ChartContainer>
    </div>
  );
}
