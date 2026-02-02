"use client";

/**
 * Scatter-style quadrant: X = sales velocity, Y = stock quantity.
 * Uses Recharts ScatterChart for consistent styling.
 */

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid } from "recharts";

export interface QuadrantPoint {
  name: string;
  velocity: number;
  quantity: number;
}

interface QuadrantChartProps {
  data: QuadrantPoint[];
  xLabel?: string;
  yLabel?: string;
}

const config: ChartConfig = {
  velocity: { label: "Velocity", color: "hsl(var(--chart-1))" },
  quantity: { label: "Quantity", color: "hsl(var(--chart-1))" },
};

export function QuadrantChart({
  data,
  xLabel = "Sales velocity",
  yLabel = "Stock quantity",
}: QuadrantChartProps) {
  const scatterData = data.map((d) => ({
    ...d,
    x: d.velocity,
    y: d.quantity,
  }));

  if (scatterData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
        No data
      </div>
    );
  }

  return (
    <ChartContainer config={config} className="w-full h-64">
      <ScatterChart margin={{ left: 12, right: 12 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          type="number"
          dataKey="velocity"
          name={xLabel}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="number"
          dataKey="quantity"
          name={yLabel}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelKey="name"
              formatter={(v, name) => [
                String(v),
                name === "velocity" ? xLabel : yLabel,
              ]}
            />
          }
        />
        <Scatter data={scatterData} fill="hsl(var(--chart-1))" name="Items" />
      </ScatterChart>
    </ChartContainer>
  );
}
