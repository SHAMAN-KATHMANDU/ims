"use client";

/**
 * Doughnut chart using Chart.js. Used by Reports for composition (location, payment, etc.).
 * No Recharts/shadcn chart.
 */
import { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { getReportChartColor } from "./palette";

ChartJS.register(ArcElement, Tooltip, Legend);

export interface ReportsDoughnutSlice {
  name: string;
  value: number;
  id: string;
}

interface ReportsDoughnutChartProps {
  data: ReportsDoughnutSlice[];
  title?: string;
  formatValue?: (n: number) => string;
  colors?: string[];
  ariaLabel?: string;
  size?: number;
}

export function ReportsDoughnutChart({
  data,
  title,
  formatValue = (n) => String(n),
  colors,
  ariaLabel,
  size = 260,
}: ReportsDoughnutChartProps) {
  const chartData = useMemo(() => {
    const palette = colors ?? data.map((_, i) => getReportChartColor(i));
    return {
      labels: data.map((d) => d.name),
      datasets: [
        {
          data: data.map((d) => d.value),
          backgroundColor: data.map((_, i) => palette[i % palette.length]),
          borderColor: data.map((_, i) => palette[i % palette.length]),
          borderWidth: 1,
          hoverOffset: 4,
        },
      ],
    };
  }, [data, colors]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "60%",
      plugins: {
        legend: { position: "right" as const },
        tooltip: {
          callbacks: {
            label: (ctx: {
              label: string;
              raw: unknown;
              dataset: { data: unknown[] };
            }) => {
              const raw = Number(ctx.raw);
              const total = (ctx.dataset?.data ?? []).reduce(
                (a: number, b: unknown) => a + Number(b),
                0,
              );
              const pct = total ? ((raw / total) * 100).toFixed(1) : "0";
              return `${ctx.label}: ${formatValue(raw)} (${pct}%)`;
            },
          },
        },
      },
    }),
    [formatValue],
  );

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground text-sm"
        style={{ height: size, width: size }}
        aria-label={ariaLabel ?? "Doughnut chart (no data)"}
      >
        No data
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-md mx-auto"
      aria-label={
        ariaLabel ?? (title ? `Doughnut: ${title}` : "Doughnut chart")
      }
      role="img"
    >
      {title && (
        <p className="text-sm font-medium text-muted-foreground mb-2 text-center">
          {title}
        </p>
      )}
      <div style={{ height: size, width: "100%" }}>
        <Doughnut data={chartData} options={options} />
      </div>
    </div>
  );
}
