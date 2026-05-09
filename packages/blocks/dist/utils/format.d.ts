export interface FormatPriceOptions {
  locale?: string;
  currency?: string;
  showDecimals?: boolean;
}
export declare const FALLBACK_PRICE = "\u2014";
export declare function formatPrice(
  value: number | string | null | undefined,
  opts?: FormatPriceOptions,
): string;
export declare function getSiteFormatOptions(
  site:
    | {
        locale?: string | null;
        currency?: string | null;
      }
    | null
    | undefined,
): Required<Pick<FormatPriceOptions, "locale" | "currency">>;
//# sourceMappingURL=format.d.ts.map
