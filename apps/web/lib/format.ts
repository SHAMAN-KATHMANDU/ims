/**
 * Single place for display formatting (currency, etc.).
 * Do not add domain-specific formatting here; keep generic.
 */

/**
 * Format amount as NPR currency (en-NP locale).
 * Single point of change for currency display across the app.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
