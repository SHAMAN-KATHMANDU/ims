import type React from "react";
import "./reports.css";

/**
 * Reports layout: applies scoped CSS for analytics pages (Chart.js, pivot).
 */
export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
