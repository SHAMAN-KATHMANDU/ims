"use client";

/**
 * Bulk permission resolution hook.
 *
 * Resolves effective permissions for many resources in a single network call
 * and seeds the per-resource cache so `useMyPermissions(resourceId)` can read
 * them synchronously on subsequent renders.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { bulkResolvePermissions } from "../services/permissions.service";
import { fromBase64 } from "../lib/bitset";
import { myPermissionKeys } from "./use-permissions";

/**
 * Calls `/permissions/me/bulk-resolve` for the given resource IDs and seeds
 * the per-resource TanStack Query cache entries so that `useMyPermissions(id)`
 * hits the cache immediately on subsequent renders.
 *
 * Returns `{ isLoading, isError }` — callers rarely need the raw data because
 * the data is available via individual `useMyPermissions` calls.
 */
export function useBulkPermissions(resourceIds: string[]): {
  isLoading: boolean;
  isError: boolean;
} {
  const qc = useQueryClient();

  // Sort IDs so the query key is stable regardless of caller order.
  const sortedIds = [...resourceIds].sort();

  const { isLoading, isError } = useQuery({
    queryKey: ["permissions", "bulk", ...sortedIds],
    queryFn: async () => {
      const result = await bulkResolvePermissions(sortedIds);
      // Seed per-resource cache entries so useMyPermissions hits them immediately.
      for (const [resourceId, base64] of Object.entries(result)) {
        qc.setQueryData(
          myPermissionKeys.byResource(resourceId),
          fromBase64(base64),
        );
      }
      return result;
    },
    enabled: sortedIds.length > 0,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  return { isLoading, isError };
}
