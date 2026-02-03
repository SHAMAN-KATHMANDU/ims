"use client";

/**
 * Time series line chart using Chart.js. Used by Reports only; no Recharts/shadcn chart.
 * Supports multiple series and linear/log scale.
 */
import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { getReportChartColor } from "./palette";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

export interface ReportsLineSeries {
  dataKey: string;
  label: string;
  color?: string;
}

const MIN_POSITIVE = 1e-6;

interface ReportsLineChartProps {
  data: Array<Record<string, unknown>>;
  series: ReportsLineSeries[];
  xKey?: string;
  height?: number;
  formatValue?: (n: number) => string;
  xLabel?: string;
  yLabel?: string;
  ariaLabel?: string;
  scale?: "linear" | "log";
}

export function ReportsLineChart({
  data,
  series,
  xKey = "date",
  height = 300,
  formatValue = (n) => String(n),
  xLabel = "Date",
  yLabel = "Amount",
  ariaLabel = "Time series line chart",
  scale = "linear",
}: ReportsLineChartProps) {
  const chartData = useMemo(() => {
    const mapped =
      scale === "log"
        ? data.map((row) => {
            const out: Record<string, unknown> = { [xKey]: row[xKey] };
            series.forEach((s) => {
              const v = Number(row[s.dataKey] ?? 0);
              out[s.dataKey] = v <= 0 ? MIN_POSITIVE : v;
            });
            return out;
          })
        : data;

    const labels = mapped.map((row) => String(row[xKey] ?? ""));

    return {
      labels,
      datasets: series.map((s, i) => ({
        label: s.label,
        data: mapped.map((row) => Number(row[s.dataKey] ?? 0)),
        borderColor: s.color ?? getReportChartColor(i),
        backgroundColor: (s.color ?? getReportChartColor(i)) + "20",
        fill: false,
        tension: 0.2,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
      })),
    };
  }, [data, series, xKey, scale]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" as const },
        tooltip: {
          callbacks: {
            label: (ctx: { dataset: { label?: string }; raw: unknown }) =>
              `${ctx.dataset?.label ?? ""}: ${formatValue(Number(ctx.raw))}`,
          },
        },
      },
      scales: {
        x: {
          title: { display: !!xLabel, text: xLabel },
          grid: { display: false },
          ticks: { maxRotation: 45, maxTicksLimit: 12 },
        },
        y: {
          type: (scale === "log" ? "logarithmic" : "linear") as
            | "linear"
            | "logarithmic",
          title: { display: !!yLabel, text: yLabel },
          grid: { color: "rgba(0,0,0,0.06)" },
          ticks: { callback: (v: number | string) => formatValue(Number(v)) },
        },
      },
    }),
    [formatValue, xLabel, yLabel, scale],
  );

  return (
    <div
      className="w-full"
      style={{ height }}
      aria-label={ariaLabel}
      role="img"
    >
      <Line data={chartData} options={options} />
    </div>
  );
}
