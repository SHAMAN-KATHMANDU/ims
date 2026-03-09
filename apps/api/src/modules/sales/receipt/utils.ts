/**
 * Formatting utilities for receipt generation.
 */

export function fmtCurrency(value: unknown): string {
  const n = Number(value);
  if (Number.isNaN(n)) return "0.00";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Format date as "Mar 8, 2026 • 11:46 AM" */
export function fmtDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const s = date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return s.replace(/,?\s*(at\s+)?(\d+:\d{2}\s*[AP]M)/i, " • $2");
}
