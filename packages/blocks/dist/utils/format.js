export const FALLBACK_PRICE = "—";
export function formatPrice(value, opts = {}) {
  const { locale = "en-IN", currency = "INR", showDecimals } = opts;
  if (value == null || value === "") return FALLBACK_PRICE;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return FALLBACK_PRICE;
  const withDecimals = showDecimals ?? n % 1 !== 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: withDecimals ? 2 : 0,
      maximumFractionDigits: withDecimals ? 2 : 0,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString(locale)}`;
  }
}
export function getSiteFormatOptions(site) {
  return {
    locale: site?.locale || "en-IN",
    currency: site?.currency || "INR",
  };
}
