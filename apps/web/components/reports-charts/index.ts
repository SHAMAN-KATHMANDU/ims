/**
 * Report-only chart components (Chart.js + minimal SVG). No Recharts/shadcn chart.
 * Use these in Reports pages to avoid CSS conflicts.
 */
export { REPORTS_CHART_COLORS, getReportChartColor } from "./palette";
export type { ReportsLineSeries } from "./ReportsLineChart";
export { ReportsLineChart } from "./ReportsLineChart";
export type { ReportsBarItem } from "./ReportsBarChart";
export { ReportsBarChart } from "./ReportsBarChart";
export type { ReportsDoughnutSlice } from "./ReportsDoughnutChart";
export { ReportsDoughnutChart } from "./ReportsDoughnutChart";
export type { ReportsAgingBucket } from "./ReportsAgingBar";
export { ReportsAgingBar } from "./ReportsAgingBar";
export type { ReportsQuadrantPoint } from "./ReportsQuadrantChart";
export { ReportsQuadrantChart } from "./ReportsQuadrantChart";
