/**
 * Default product code (ims_code): tenant initials + suffix from product UUID hex.
 * Domain-specific naming; not a generic string utility.
 */

const MAX_PREFIX_LEN = 4;
const MIN_SUFFIX_LEN = 3;

/** Visible ASCII alnum for Prisma VarChar ims_code (max 100). */
function sanitizePrefix(s: string): string {
  return s.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function initialsFromTenantName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "XX";

  const words = trimmed.split(/[\s\-_.&,]+/).filter(Boolean);
  const chars: string[] = [];

  if (words.length >= 2) {
    for (const w of words) {
      const alnum = w.replace(/[^a-zA-Z0-9]/g, "");
      if (alnum.length > 0) {
        chars.push(alnum[0]!.toUpperCase());
      }
      if (chars.length >= MAX_PREFIX_LEN) break;
    }
    if (chars.length === 0) return "XX";
    if (chars.length === 1) return `${chars[0]}X`;
    return chars.join("");
  }

  const w = words[0] ?? trimmed;
  const alnum = w.replace(/[^a-zA-Z0-9]/g, "");
  if (alnum.length >= 2) {
    return alnum.slice(0, 2).toUpperCase();
  }
  if (alnum.length === 1) {
    return `${alnum.toUpperCase()}X`;
  }
  return "XX";
}

export function buildDefaultImsCode(
  tenantName: string,
  productId: string,
  suffixCharCount: number,
): string {
  const hex = productId.replace(/-/g, "").toUpperCase();
  const n = Math.min(Math.max(suffixCharCount, MIN_SUFFIX_LEN), hex.length);
  const suffix = hex.slice(-n);
  const prefix = sanitizePrefix(initialsFromTenantName(tenantName));
  return `${prefix}${suffix}`;
}

/**
 * Yields candidate ims codes for a new product: lengthening hex suffix, then disambiguating.
 */
export function* defaultImsCodeCandidates(
  tenantName: string,
  productId: string,
): Generator<string> {
  const hex = productId.replace(/-/g, "").toUpperCase();
  const prefix = sanitizePrefix(initialsFromTenantName(tenantName));

  for (let len = MIN_SUFFIX_LEN; len <= hex.length; len++) {
    yield `${prefix}${hex.slice(-len)}`;
  }

  let counter = 2;
  for (;;) {
    yield `${prefix}${hex}-${counter}`;
    counter += 1;
  }
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
