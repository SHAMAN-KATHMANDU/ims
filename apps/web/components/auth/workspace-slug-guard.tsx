"use client";

import type React from "react";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useAuthStore,
  selectTenant,
  selectIsHydrated,
} from "@/stores/auth-store";
import { LoadingPage } from "../layout/loading-page";

/**
 * Ensures the URL workspace slug matches the authenticated user's tenant.
 * Redirects to 401 when the user navigates to a workspace they do not belong to.
 * Must run after AuthGuard (user is authenticated).
 */
export function WorkspaceSlugGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams();
  const isHydrated = useAuthStore(selectIsHydrated);
  const tenant = useAuthStore(selectTenant);

  const workspace = (params?.workspace as string)?.trim().toLowerCase() ?? "";
  const tenantSlug = tenant?.slug?.trim().toLowerCase() ?? "";

  useEffect(() => {
    if (!isHydrated) return;
    if (!workspace || !tenantSlug) return;

    if (workspace !== tenantSlug) {
      router.replace("/401");
    }
  }, [isHydrated, workspace, tenantSlug, router]);

  if (!isHydrated) {
    return <LoadingPage />;
  }

  if (workspace && tenantSlug && workspace !== tenantSlug) {
    return null;
  }

  return <>{children}</>;
}
