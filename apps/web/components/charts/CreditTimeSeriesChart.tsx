"use client";

/**
 * Two-line time series for credit issued vs credit paid over time.
 */

import { TimeSeriesLineChart } from "./TimeSeriesLineChart";

export interface CreditTimeSeriesPoint {
  date: string;
  issued: number;
  paid: number;
}

interface CreditTimeSeriesChartProps {
  data: CreditTimeSeriesPoint[];
  height?: number;
  scale?: "linear" | "log";
}

export function CreditTimeSeriesChart({
  data,
  height = 280,
  scale = "linear",
}: CreditTimeSeriesChartProps) {
  return (
    <TimeSeriesLineChart
      data={data as unknown as Array<Record<string, unknown>>}
      series={[
        {
          dataKey: "issued",
          label: "Credit issued",
          color: "hsl(var(--chart-1))",
        },
        { dataKey: "paid", label: "Credit paid", color: "hsl(var(--chart-2))" },
      ]}
      xKey="date"
      height={height}
      xLabel="Date"
      yLabel="Amount"
      ariaLabel="Credit issued vs paid over time"
      scale={scale}
    />
  );
}
