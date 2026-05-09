export interface FormatPriceOptions {
  locale?: string;
  currency?: string;
  showDecimals?: boolean;
}

export const FALLBACK_PRICE = "—";

export function formatPrice(
  value: number | string | null | undefined,
  opts: FormatPriceOptions = {},
): string {
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

export function getSiteFormatOptions(
  site: { locale?: string | null; currency?: string | null } | null | undefined,
): Required<Pick<FormatPriceOptions, "locale" | "currency">> {
  return {
    locale: site?.locale || "en-IN",
    currency: site?.currency || "INR",
  };
}
