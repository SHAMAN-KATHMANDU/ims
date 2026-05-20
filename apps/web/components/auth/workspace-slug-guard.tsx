"use client";

import type React from "react";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth";
import { LoadingPage } from "../layout/loading-page";

/**
 * Ensures the URL workspace slug matches the authenticated user's tenant.
 * Redirects to /401 when the user navigates to a workspace they do not belong to.
 * Must run after AuthGuard (user is authenticated).
 *
 * The comparison uses `serverTenant` — the tenant returned by `/auth/me` — and
 * never the persisted `auth-storage` cookie. The cookie copy can be stale: it
 * is routinely written before tenant data settles, and an oversized cookie
 * write is dropped silently by the browser, leaving an out-of-date slug behind.
 * Trusting it bounced legitimate users to "Unauthorized Access" across every
 * admin page (issue #486 — seen on mobile, where the cookie had gone stale).
 *
 * When `/auth/me` has not produced an authoritative tenant (still loading, or
 * the request failed) the guard fails open and renders the page: the API is
 * tenant-scoped server-side and remains the real isolation boundary.
 */
export function WorkspaceSlugGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams();
  const { serverTenant, isLoading, isAuthenticated } = useAuth();

  const workspace = (params?.workspace as string)?.trim().toLowerCase() ?? "";
  const tenantSlug = serverTenant?.slug?.trim().toLowerCase() ?? "";

  // Only a server-confirmed tenant that differs from the URL slug is a real
  // mismatch. An empty `tenantSlug` means "not confirmed" — never a mismatch.
  const isMismatch =
    !isLoading &&
    isAuthenticated &&
    workspace.length > 0 &&
    tenantSlug.length > 0 &&
    workspace !== tenantSlug;

  useEffect(() => {
    if (isMismatch) {
      router.replace("/401");
    }
  }, [isMismatch, router]);

  if (isLoading) {
    return <LoadingPage />;
  }

  if (isMismatch) {
    return null;
  }

  return <>{children}</>;
}
