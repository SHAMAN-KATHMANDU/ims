"use client";

import { type ReactNode } from "react";
import { useCan } from "../hooks/use-permissions";

export interface CanProps {
  /** Catalog permission key, e.g. `SETTINGS.ROLES.MANAGE`. */
  perm: string;
  /** Optional resource scope — defaults to workspace. */
  resourceId?: string;
  /** Rendered when the user lacks the permission. Defaults to `null`. */
  fallback?: ReactNode;
  /** Rendered while the effective bitset is still loading. */
  loading?: ReactNode;
  children: ReactNode;
}

/**
 * Inline gate. Renders children only if the current user has `perm` on the
 * given resource (or workspace if unscoped).
 */
export function Can({
  perm,
  resourceId,
  fallback = null,
  loading = null,
  children,
}: CanProps) {
  const { allowed, isLoading } = useCan(perm, resourceId);
  if (isLoading) return <>{loading}</>;
  return <>{allowed ? children : fallback}</>;
}
