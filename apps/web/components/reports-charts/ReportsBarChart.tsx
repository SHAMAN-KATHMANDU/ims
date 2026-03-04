"use client";

/**
 * Bar chart using Chart.js. Used by Reports for user/category performance.
 * No Recharts/shadcn chart.
 */
import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { getReportChartColor } from "./palette";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

export interface ReportsBarItem {
  username: string;
  value: number;
  userId: string;
}

interface ReportsBarChartProps {
  data: ReportsBarItem[];
  valueLabel: string;
  formatValue?: (n: number) => string;
  color?: string;
  xLabel?: string;
  yLabel?: string;
  ariaLabel?: string;
  scale?: "linear" | "log";
  height?: number;
}

export function ReportsBarChart({
  data,
  valueLabel,
  formatValue = (n) => String(n),
  color,
  xLabel = "User",
  yLabel,
  ariaLabel,
  scale = "linear",
  height = 280,
}: ReportsBarChartProps) {
  const chartData = useMemo(() => {
    const mapped =
      scale === "log"
        ? data.map((d) => ({ ...d, value: d.value <= 0 ? 1e-6 : d.value }))
        : data;
    return {
      labels: mapped.map((d) => d.username),
      datasets: [
        {
          label: valueLabel,
          data: mapped.map((d) => d.value),
          backgroundColor: color ?? getReportChartColor(0),
          borderColor: color ?? getReportChartColor(0),
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  }, [data, valueLabel, color, scale]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "x" as const,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: { raw: unknown }) =>
              `${valueLabel}: ${formatValue(Number(ctx.raw))}`,
          },
        },
      },
      scales: {
        x: {
          title: { display: !!xLabel, text: xLabel },
          grid: { display: false },
          ticks: { maxRotation: -45, maxTicksLimit: 15 },
        },
        y: {
          type: (scale === "log" ? "logarithmic" : "linear") as
            | "linear"
            | "logarithmic",
          title: { display: !!yLabel, text: yLabel ?? valueLabel },
          grid: { color: "rgba(0,0,0,0.06)" },
          ticks: { callback: (v: number | string) => formatValue(Number(v)) },
        },
      },
    }),
    [formatValue, valueLabel, xLabel, yLabel, scale],
  );

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground text-sm h-[var(--chart-height)]"
        style={{ "--chart-height": `${height}px` } as React.CSSProperties}
        aria-label={ariaLabel ?? "Bar chart (no data)"}
      >
        No data
      </div>
    );
  }

  return (
    <div
      className="w-full h-[var(--chart-height)]"
      style={{ "--chart-height": `${height}px` } as React.CSSProperties}
      aria-label={ariaLabel ?? `${valueLabel} by ${xLabel}`}
      role="img"
    >
      <Bar data={chartData} options={options} />
    </div>
  );
}
