/** Compact number/currency formatting for CRM charts and KPI tiles. */

/** "1.2M", "420K", "980" — locale-aware compact notation. */
export function formatCompact(n: number): string {
  return new Intl.NumberFormat("en-NP", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n ?? 0);
}

/** Compact currency for KPI tiles, e.g. "NPR 1.2M". */
export function formatCompactCurrency(n: number): string {
  return `NPR ${formatCompact(n ?? 0)}`;
}
