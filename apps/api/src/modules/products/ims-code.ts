/**
 * Human-readable default product code (ims_code): {slug}-{C}{S?}{N}
 * Domain-specific naming; not a generic string utility.
 */

/** Escape a string for use inside a RegExp constructor. */
export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** First ASCII letter or digit in the label, uppercased; else X. */
export function firstImsCodeLetter(label: string): string {
  const m = label.match(/[a-zA-Z0-9]/);
  return m ? m[0]!.toUpperCase() : "X";
}

/**
 * Tenant slug segment for ims_code: alnum only, lowercased.
 * Falls back to "tenant" if empty after stripping.
 */
export function sanitizeSlugForImsCode(slug: string): string {
  const s = slug.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return s.length > 0 ? s : "tenant";
}

/**
 * Prefix before the numeric suffix (no trailing digits).
 * `sanitizedSlug` should already be passed through sanitizeSlugForImsCode.
 */
export function buildImsCodePrefix(
  sanitizedSlug: string,
  categoryName: string,
  subCategory: string | null | undefined,
): string {
  const c = firstImsCodeLetter(categoryName);
  const sub = subCategory?.trim();
  const s = sub ? firstImsCodeLetter(sub) : "";
  return `${sanitizedSlug}-${c}${s}`;
}

/**
 * Max trailing integer N among codes that match `^prefix(\d+)$`.
 */
export function maxNumericSuffixForPrefix(
  imsCodes: string[],
  prefix: string,
): number {
  const re = new RegExp(`^${escapeRegex(prefix)}(\\d+)$`);
  let max = 0;
  for (const code of imsCodes) {
    const m = code.match(re);
    if (m) {
      const n = parseInt(m[1]!, 10);
      if (Number.isFinite(n)) max = Math.max(max, n);
    }
  }
  return max;
}

/** Prisma P2002 on (tenantId, imsCode) for products. */
export function isProductImsCodeTenantUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; meta?: { target?: string[] } };
  if (e.code !== "P2002") return false;
  const target = e.meta?.target as string[] | undefined;
  if (!target || target.length !== 2) return true;
  const hasIms = target.some((f) => f === "ims_code" || f === "imsCode");
  const hasTenant = target.some((f) => f === "tenantId" || f === "tenant_id");
  return hasIms && hasTenant;
}
