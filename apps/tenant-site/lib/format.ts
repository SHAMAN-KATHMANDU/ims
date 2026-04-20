/**
 * Tenant-aware price / number formatting.
 *
 * Canonical `formatPrice()` replaces the ad-hoc "₹${n.toLocaleString('en-IN')}"
 * patterns scattered across blocks, cart, and checkout. Tenants can now
 * configure their `SiteConfig.currency` (INR, USD, NPR, …) and
 * `SiteConfig.defaultLocale` (en-IN, ne-NP, en-US, …) and have every
 * price render correctly — right symbol, right thousand separator, right
 * decimal style — without each callsite re-deriving that mapping.
 *
 * Intl.NumberFormat does the heavy lifting:
 *   - style: "currency" → emits the correct symbol (₹, Rs, $, €, …)
 *   - locale → controls thousand separators + digit grouping (en-IN
 *     groups as 1,00,000 but en-US groups as 100,000)
 *
 * If Intl rejects the locale / currency combination (e.g. typo in
 * tenant config), we degrade to `${currency} ${n.toLocaleString(locale)}`
 * so the page renders instead of throwing.
 */

export interface FormatPriceOptions {
  /** BCP-47 locale. Defaults to "en-IN" to match legacy behavior. */
  locale?: string;
  /** ISO 4217 currency code. Defaults to "INR". */
  currency?: string;
  /**
   * Force decimal digits on / off. When omitted, we auto-hide decimals
   * for whole-number values (₹1,500 not ₹1,500.00) and show them for
   * fractional values. Pass `true` to always show two digits, `false`
   * to always hide.
   */
  showDecimals?: boolean;
}

export const FALLBACK_PRICE = "—";

/**
 * Format a numeric price in tenant-configured locale + currency.
 *
 * Accepts strings because Prisma Decimal fields come across the wire
 * as strings. Returns `FALLBACK_PRICE` for nullish / non-finite input.
 */
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

/**
 * Pull the `{ locale, currency }` pair a block or component needs from a
 * `PublicSite` payload. Centralized so the defaults stay in one place.
 */
export function getSiteFormatOptions(
  site: { locale?: string | null; currency?: string | null } | null | undefined,
): Required<Pick<FormatPriceOptions, "locale" | "currency">> {
  return {
    locale: site?.locale || "en-IN",
    currency: site?.currency || "INR",
  };
}
