"use client";

/**
 * Socket.IO listener for real-time permission invalidation.
 *
 * When the backend emits `permissions:invalidated` (e.g. after a role
 * assignment change), this hook flushes the entire `my-permissions` query
 * cache so the next render fetches fresh bitsets.
 *
 * Mount this hook once at the root of the authenticated layout; it is a no-op
 * until the socket connects.
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { acquireSocket, releaseSocket } from "@/lib/socket";
import { myPermissionKeys } from "./use-permissions";

export function usePermissionsSocket(): void {
  const qc = useQueryClient();

  useEffect(() => {
    const socket = acquireSocket();

    const onInvalidated = () => {
      // Flush all cached permission bitsets so next render re-fetches.
      qc.invalidateQueries({ queryKey: myPermissionKeys.all });
    };

    socket.on("permissions:invalidated", onInvalidated);

    return () => {
      socket.off("permissions:invalidated", onInvalidated);
      releaseSocket();
    };
  }, [qc]);
}
