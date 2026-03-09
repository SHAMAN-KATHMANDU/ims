"use client";

import type React from "react";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useActiveLocations } from "@/features/locations";
import { useAuthStore, selectUser } from "@/store/auth-store";

/**
 * Redirects to onboarding when tenant has no default warehouse.
 * Skips redirect when already on the onboarding page.
 * Platform admins are skipped (system-level, no warehouse required).
 */
export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore(selectUser);
  const { data: locations = [], isLoading } = useActiveLocations();

  const isOnboardingPage = pathname?.endsWith("/onboarding");
  const hasDefaultWarehouse =
    locations.length > 0 &&
    locations.some((loc) => loc.isDefaultWarehouse === true);
  const needsOnboarding = !hasDefaultWarehouse;

  useEffect(() => {
    if (user?.role === "platformAdmin") return;
    if (isLoading) return;
    if (isOnboardingPage) return;
    if (needsOnboarding) {
      const segments = pathname?.split("/").filter(Boolean) ?? [];
      const workspace = segments[0] ?? "admin";
      router.replace(`/${workspace}/onboarding`);
    }
  }, [
    user?.role,
    isLoading,
    isOnboardingPage,
    needsOnboarding,
    pathname,
    router,
  ]);

  return <>{children}</>;
}
