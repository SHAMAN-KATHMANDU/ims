"use client";

/**
 * Current-user permission resolution hooks.
 *
 * `useMyPermissions(resourceId?)` fetches the effective 64-byte bitset for the
 * current user against the given resource. When `resourceId` is undefined, we
 * resolve against the workspace (no resourceId → "workspace" sentinel).
 *
 * `useCan(key, resourceId?)` is a synchronous-ish sugar that returns boolean
 * (plus a loading flag) for UI decisions.
 *
 * ui-perm-core is expected to extend this module with:
 *   - Socket.IO listener for `permissions:invalidated` → cache flush
 *   - Bulk-resolve cache (batching many `useCan` calls per page)
 */

import { useQuery } from "@tanstack/react-query";
import { PERMISSION_BY_KEY, ADMINISTRATOR_BIT } from "@repo/shared";
import { getEffectivePermissions } from "../services/permissions.service";
import { fromBase64, hasBit } from "../lib/bitset";

/** Cache key for the workspace-scope mask (API resolves the workspace
 * Resource server-side when no resourceId is sent). */
const WORKSPACE_KEY = "workspace";

export const myPermissionKeys = {
  all: ["my-permissions"] as const,
  byResource: (resourceId: string) =>
    [...myPermissionKeys.all, resourceId] as const,
};

export function useMyPermissions(resourceId?: string) {
  const cacheKey = resourceId ?? WORKSPACE_KEY;
  return useQuery({
    queryKey: myPermissionKeys.byResource(cacheKey),
    queryFn: async () => {
      // Pass undefined to omit the param entirely — API resolves the tenant's
      // WORKSPACE Resource itself. Sending the literal "workspace" would fail
      // the UUID validation on the backend Zod schema.
      const res = await getEffectivePermissions(resourceId);
      return fromBase64(res.permissions);
    },
    // Server state: stale briefly but retained indefinitely. Invalidated via
    // socket push by ui-perm-core when assignments change.
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}

/**
 * Result shape for `useCan`. `isLoading` is true until the effective bitset
 * arrives; treat `allowed=false` as "not yet granted" during load to fail
 * closed in the UI.
 */
export interface UseCanResult {
  allowed: boolean;
  isLoading: boolean;
}

/**
 * Synchronous-style permission check. Returns false while loading to avoid
 * leaking gated UI to users who lack the permission.
 */
export function useCan(
  permissionKey: string,
  resourceId?: string,
): UseCanResult {
  const { data: bits, isLoading } = useMyPermissions(resourceId);
  if (!bits) return { allowed: false, isLoading };

  // Administrator bit always bypasses.
  if (hasBit(bits, ADMINISTRATOR_BIT)) {
    return { allowed: true, isLoading: false };
  }

  const def = PERMISSION_BY_KEY.get(permissionKey);
  if (!def) {
    // Unknown key → fail closed and log for devs.
    if (typeof console !== "undefined") {
      console.warn(`[useCan] Unknown permission key: ${permissionKey}`);
    }
    return { allowed: false, isLoading: false };
  }
  return { allowed: hasBit(bits, def.bit), isLoading: false };
}
