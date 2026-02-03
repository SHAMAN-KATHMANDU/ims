"use client";

/**
 * Horizontal bar chart for aging buckets (e.g. credit 0-7, 8-30, 30+ days).
 * Uses Chart.js; no Recharts.
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

export interface ReportsAgingBucket {
  bucket: string;
  value: number;
}

interface ReportsAgingBarProps {
  data: ReportsAgingBucket[];
  formatValue?: (n: number) => string;
  color?: string;
  xLabel?: string;
  yLabel?: string;
  ariaLabel?: string;
  scale?: "linear" | "log";
  height?: number;
}

export function ReportsAgingBar({
  data,
  formatValue = (n) => String(n),
  color,
  xLabel = "Amount",
  yLabel = "Bucket",
  ariaLabel = "Aging buckets",
  scale = "linear",
  height = 180,
}: ReportsAgingBarProps) {
  const chartData = useMemo(() => {
    const mapped =
      scale === "log"
        ? data.map((d) => ({
            ...d,
            value: d.value <= 0 ? 1e-6 : d.value,
          }))
        : data;
    return {
      labels: mapped.map((d) => d.bucket),
      datasets: [
        {
          label: xLabel,
          data: mapped.map((d) => d.value),
          backgroundColor: color ?? getReportChartColor(0),
          borderColor: color ?? getReportChartColor(0),
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  }, [data, xLabel, color, scale]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y" as const,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: { raw: unknown }) => formatValue(Number(ctx.raw)),
          },
        },
      },
      scales: {
        x: {
          type: (scale === "log" ? "logarithmic" : "linear") as
            | "linear"
            | "logarithmic",
          title: { display: !!xLabel, text: xLabel },
          grid: { color: "rgba(0,0,0,0.06)" },
          ticks: { callback: (v: number | string) => formatValue(Number(v)) },
        },
        y: {
          title: { display: !!yLabel, text: yLabel },
          grid: { display: false },
        },
      },
    }),
    [formatValue, xLabel, yLabel, scale],
  );

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground text-sm"
        style={{ height }}
        aria-label={ariaLabel}
      >
        No data
      </div>
    );
  }

  return (
    <div
      className="w-full"
      style={{ height }}
      aria-label={ariaLabel}
      role="img"
    >
      <Bar data={chartData} options={options} />
    </div>
  );
}
