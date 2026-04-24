/**
 * Shared helpers to apply `permissionService.filterVisible` to list queries.
 *
 * These wrap the raw `filterVisible` call so modules don't duplicate the
 * "fetch a batch → ask the permission service which ones the user can see →
 * drop the rest" pattern.
 *
 * In Phase 1, `permissionService.filterVisible` is a stub that returns every
 * id it was given. Once real checks land, every call site automatically picks
 * up the enforcement without further changes.
 *
 * Usage:
 *   // Simple list
 *   const visible = await filterVisibleItems(tenantId, userId, items);
 *
 *   // Paginated list (preserve pagination metadata)
 *   const result = await paginatedFilterVisible(tenantId, userId, page);
 */
import { permissionService } from "@/modules/permissions/permission.service";

export interface HasId {
  id: string;
}

export interface PaginatedLike<T extends HasId> {
  items: T[];
  pagination?: unknown;
}

/**
 * Filter a list of entities down to those the user can view.
 * Preserves original order.
 *
 * @param permissionKey — the VIEW permission to check for each item
 *   (e.g. `"SALES.SALES.VIEW"`). Required so the underlying service checks
 *   the right bit when the list is homogeneous.
 */
export async function filterVisibleItems<T extends HasId>(
  tenantId: string,
  userId: string,
  items: readonly T[],
  permissionKey: string,
): Promise<T[]> {
  if (items.length === 0) return [];
  const ids = items.map((i) => i.id);
  const visible = await permissionService.filterVisible(
    tenantId,
    userId,
    ids,
    permissionKey,
  );
  return items.filter((i) => visible.has(i.id));
}

/**
 * Paginated variant. Takes any `{ <arrayKey>, pagination? }` shape where the
 * array of entities lives under `arrayKey` (defaults to "items"). Returns the
 * same shape with the array filtered down to visible rows.
 *
 * Note: this filters AFTER the repository returns a page, so the pagination
 * counts reflect the pre-filter page size. Once the permission service has a
 * SQL-level predicate, this can be pushed into the repository. Until then the
 * stub returns every row so behaviour is unchanged.
 */
export async function paginatedFilterVisible<
  T extends HasId,
  K extends string = "data",
  P extends { pagination?: unknown } & Record<K, T[]> = {
    pagination?: unknown;
  } & Record<K, T[]>,
>(
  tenantId: string,
  userId: string,
  page: P,
  permissionKey: string,
  arrayKey: K = "data" as K,
): Promise<P> {
  const items = page[arrayKey];
  if (!Array.isArray(items) || items.length === 0) return page;
  const visible = await filterVisibleItems(
    tenantId,
    userId,
    items,
    permissionKey,
  );
  return { ...page, [arrayKey]: visible };
}
