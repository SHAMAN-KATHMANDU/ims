"use client";

import type React from "react";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useActiveLocations } from "@/hooks/useLocation";

/**
 * Redirects to onboarding when tenant has no default warehouse.
 * Skips redirect when already on the onboarding page.
 */
export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: locations = [], isLoading } = useActiveLocations();

  const isOnboardingPage = pathname?.endsWith("/onboarding");
  const hasDefaultWarehouse =
    locations.length > 0 &&
    locations.some((loc) => loc.isDefaultWarehouse === true);
  const needsOnboarding = !hasDefaultWarehouse;

  useEffect(() => {
    if (isLoading) return;
    if (isOnboardingPage) return;
    if (needsOnboarding) {
      const segments = pathname?.split("/").filter(Boolean) ?? [];
      const workspace = segments[0] ?? "admin";
      router.replace(`/${workspace}/onboarding`);
    }
  }, [isLoading, isOnboardingPage, needsOnboarding, pathname, router]);

  return <>{children}</>;
}
