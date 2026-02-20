"use client";

import type React from "react";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LoadingPage } from "../layout/loading-page";
import type { UserRole } from "@/utils/auth";
import { getWorkspaceRoot } from "@/config/routes";

interface AuthGuardProps {
  children: React.ReactNode;
  /**
   * Path to redirect to when not authenticated (e.g. /ruby/login when slug is in URL).
   * Default: "/login"
   */
  loginPath?: string;
  /**
   * Optional: Restrict to specific roles.
   * If not provided, just checks authentication.
   */
  roles?: UserRole[];
  /**
   * Path to redirect if role check fails.
   * Default: "/401"
   */
  unauthorizedPath?: string;
}

/**
 * AuthGuard Component
 *
 * Unified authentication and authorization guard.
 * Replaces both ProtectedRoute and RoleProtectedRoute.
 *
 * Features:
 * - Checks authentication (redirects to /login if not authenticated)
 * - Optionally checks roles (redirects to unauthorizedPath if not authorized)
 * - Shows loading state during hydration
 *
 * Note: Server-side protection is handled by middleware.ts
 * This component handles client-side state and loading UI.
 *
 * @example
 * // Just auth check
 * <AuthGuard>
 *   <Dashboard />
 * </AuthGuard>
 *
 * @example
 * // Auth + role check
 * <AuthGuard roles={["admin", "superAdmin"]}>
 *   <AdminPanel />
 * </AuthGuard>
 */
export function AuthGuard({
  children,
  loginPath = "/login",
  roles,
  unauthorizedPath = "/401",
}: AuthGuardProps) {
  const router = useRouter();
  const params = useParams();
  const { user, tenant, isAuthenticated, isLoading, isHydrated } = useAuth();
  const urlSlug = (params?.workspace as string)?.trim();

  useEffect(() => {
    // Wait for hydration
    if (!isHydrated) return;

    // Not authenticated - redirect to login (slug-based path when in tenant URL)
    if (!isAuthenticated) {
      router.push(loginPath);
      return;
    }

    // Tenant slug enforcement: tenant users must use their tenant's URL
    // Platform admins can access any workspace
    if (
      user?.role !== "platformAdmin" &&
      tenant?.slug &&
      urlSlug &&
      urlSlug.toLowerCase() !== tenant.slug.toLowerCase()
    ) {
      router.replace(getWorkspaceRoot(tenant.slug));
      return;
    }

    // Role check (if roles are specified)
    if (roles && user && !roles.includes(user.role)) {
      router.push(unauthorizedPath);
    }
  }, [
    isAuthenticated,
    isHydrated,
    user,
    tenant,
    urlSlug,
    roles,
    unauthorizedPath,
    loginPath,
    router,
  ]);

  // Show loading while hydrating
  if (isLoading || !isHydrated) {
    return <LoadingPage />;
  }

  // Not authenticated - will redirect
  if (!isAuthenticated) {
    return null;
  }

  // Role check failed - will redirect
  if (roles && user && !roles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
