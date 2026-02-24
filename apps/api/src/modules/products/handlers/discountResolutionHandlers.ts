/**
 * Product discount resolution - resolve discount type by id or name from a list.
 * Pure helpers for use in controllers/services that already have discount types loaded.
 */

export type DiscountTypeOption = { id: string; name: string };

/**
 * Finds a discount type in the list by id or name (case-insensitive).
 * identifier can be a UUID or a name.
 */
export function resolveDiscountTypeFromList(
  identifier: string,
  discountTypes: DiscountTypeOption[],
): DiscountTypeOption | null {
  if (!identifier || !discountTypes?.length) return null;
  const trimmed = String(identifier).trim();
  const byId = discountTypes.find((dt) => dt.id === trimmed);
  if (byId) return byId;
  const lower = trimmed.toLowerCase();
  const byName = discountTypes.find((dt) => dt.name?.toLowerCase() === lower);
  return byName ?? null;
}
