"use client";

import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { useAuthStore, selectTenantWebsiteEnabled } from "@/store/auth-store";

export interface TenantWebsitePageGuardProps {
  children: ReactNode;
}

/**
 * Page guard for routes gated on the per-tenant website feature flag.
 *
 * Flipped by platform admins via /platform/tenants/:id/website/enable. The
 * flag rides on the `/auth/me` and `/auth/login` tenant payload so the
 * guard is synchronous — no network call on every page load — and renders
 * a 404 when the tenant doesn't have the feature turned on.
 *
 * Pair with `EnvFeaturePageGuard` for routes that also need the platform
 * env flag: once both pass, the feature is fully live for the tenant.
 */
export function TenantWebsitePageGuard({
  children,
}: TenantWebsitePageGuardProps) {
  const enabled = useAuthStore(selectTenantWebsiteEnabled);
  if (!enabled) notFound();
  return <>{children}</>;
}
