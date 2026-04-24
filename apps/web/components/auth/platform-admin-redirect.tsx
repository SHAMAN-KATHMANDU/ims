"use client";

import { useEffect, type ReactNode } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useAuthStore, selectUserRole } from "@/store/auth-store";

/**
 * Punts `platformAdmin` users out of the tenant dashboard and into the
 * dedicated platform console at `/[workspace]/platform/tenants`. Mounted
 * inside the `(admin)` layout so the redirect happens before any
 * tenant-scoped data hooks fire (prefetches sit beneath the redirect).
 *
 * Pages already under `/platform/*` short-circuit because they live in the
 * `(platform)` route group, not `(admin)`.
 */
export function PlatformAdminRedirect({ children }: { children: ReactNode }) {
  const role = useAuthStore(selectUserRole);
  const router = useRouter();
  const params = useParams<{ workspace: string }>();
  const pathname = usePathname() ?? "";

  useEffect(() => {
    if (role !== "platformAdmin") return;
    const workspace = params?.workspace ?? "admin";
    const target = `/${workspace}/platform/tenants`;
    if (!pathname.startsWith(`/${workspace}/platform`)) {
      router.replace(target);
    }
  }, [role, router, params, pathname]);

  // While redirecting, suppress the dashboard children so we don't briefly
  // mount tenant-scoped hooks for a platform admin.
  if (role === "platformAdmin") return null;
  return <>{children}</>;
}
