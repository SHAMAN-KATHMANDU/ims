/**
 * Shared color palette for Reports charts (Chart.js). Vibrant, distinct colors.
 * Use these so report charts are colorful and consistent without relying on Recharts/CSS vars.
 */
export const REPORTS_CHART_COLORS = [
  "#2563eb", // blue
  "#16a34a", // green
  "#ea580c", // orange
  "#9333ea", // purple
  "#dc2626", // red
  "#0891b2", // cyan
  "#ca8a04", // yellow
  "#db2777", // pink
] as const;

export function getReportChartColor(index: number): string {
  const i = index % REPORTS_CHART_COLORS.length;
  const c = REPORTS_CHART_COLORS[i];
  return c ?? REPORTS_CHART_COLORS[0];
}
