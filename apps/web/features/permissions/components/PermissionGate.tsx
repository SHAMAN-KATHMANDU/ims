"use client";

import { type ReactNode } from "react";
import { Lock } from "lucide-react";
import { useCan } from "../hooks/use-permissions";

export interface PermissionGateProps {
  /** Catalog permission key required to view children. */
  perm: string;
  /** Optional resource scope — defaults to workspace. */
  resourceId?: string;
  /** Custom fallback; defaults to a friendly "No access" card. */
  fallback?: ReactNode;
  /** Shown while the effective bitset is loading. */
  loading?: ReactNode;
  children: ReactNode;
}

/**
 * Page/section-level gate. Renders a helpful "No access" panel when the
 * current user lacks the permission, vs. `<Can>` which renders `null` by
 * default and is meant for inline buttons/menu items.
 */
export function PermissionGate({
  perm,
  resourceId,
  fallback,
  loading,
  children,
}: PermissionGateProps) {
  const { allowed, isLoading } = useCan(perm, resourceId);

  if (isLoading) {
    return (
      <>
        {loading ?? (
          <div
            className="flex h-64 items-center justify-center text-sm text-muted-foreground"
            aria-busy="true"
            role="status"
          >
            Loading permissions…
          </div>
        )}
      </>
    );
  }

  if (allowed) return <>{children}</>;

  if (fallback !== undefined) return <>{fallback}</>;

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/40 py-16 text-center">
      <Lock className="h-8 w-8 text-muted-foreground" aria-hidden />
      <div className="space-y-1">
        <p className="text-base font-medium">You don&rsquo;t have access</p>
        <p className="text-sm text-muted-foreground">
          This area requires the <code className="font-mono">{perm}</code>{" "}
          permission.
        </p>
      </div>
    </div>
  );
}
