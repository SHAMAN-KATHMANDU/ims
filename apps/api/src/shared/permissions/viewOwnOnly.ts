/**
 * Helper for the CRM "assigned to me" scope.
 *
 * Several CRM resources (Leads, Deals, Tasks, Contacts) have two VIEW
 * permissions in the catalog:
 *   - `<key>.VIEW`           — see every row in the tenant
 *   - `<key>.VIEW_OWN_ONLY`  — see only rows assigned to the caller
 *
 * `scopeByAssignment` is called from a list service AFTER the repository
 * returns a page. It returns the items unchanged if the user has the broad
 * VIEW permission; otherwise it narrows the list to rows where
 * `ownerId(row) === userId`.
 *
 * Phase 1 note: `permissionService.can` is a stub that returns false for
 * non-ADMINISTRATOR users. To keep behaviour identical to the pre-RBAC state
 * while the real resolver lands, we fall back to "return all" whenever the
 * stub can't answer — the real check will kick in once `can` returns truthy
 * values for non-admin users.
 */
import { permissionService } from "@/modules/permissions/permission.service";

export interface OwnedLike {
  id: string;
}

export async function scopeByAssignment<T extends OwnedLike>(
  tenantId: string,
  userId: string,
  items: readonly T[],
  ownerOf: (row: T) => string | null | undefined,
  viewKey: string,
  viewOwnOnlyKey: string,
  resourceId = "workspace",
): Promise<T[]> {
  if (items.length === 0) return [];

  const hasFullView = await permissionService.can(
    tenantId,
    userId,
    resourceId,
    viewKey,
  );
  if (hasFullView) return [...items];

  const hasOwnOnly = await permissionService.can(
    tenantId,
    userId,
    resourceId,
    viewOwnOnlyKey,
  );
  if (!hasOwnOnly) {
    // Neither permission: keep current behaviour (stub returns false for
    // everything, so don't surprise callers — return unchanged). Once the
    // real resolver lands this branch should return an empty array.
    return [...items];
  }

  return items.filter((row) => ownerOf(row) === userId);
}
