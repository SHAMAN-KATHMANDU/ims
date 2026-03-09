"use client";

/**
 * React Query hooks for dashboard. Dashboard uses its own endpoints;
 * do not call analytics from dashboard.
 */

import { useQuery } from "@tanstack/react-query";
import {
  getDashboardUserSummary,
  getDashboardAdminSummary,
  getDashboardSuperAdminSummary,
  DASHBOARD_STALE_TIME_MS,
} from "../services/dashboard.service";
import { getPlatformStats } from "@/features/tenants";
import { useAuthStore, selectUserRole } from "@/store/auth-store";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  userSummary: () => [...dashboardKeys.all, "user-summary"] as const,
  adminSummary: () => [...dashboardKeys.all, "admin-summary"] as const,
  superAdminSummary: () =>
    [...dashboardKeys.all, "superadmin-summary"] as const,
  platformSummary: () => [...dashboardKeys.all, "platform-summary"] as const,
};

export function useDashboardUserSummary() {
  const role = useAuthStore(selectUserRole);
  return useQuery({
    queryKey: dashboardKeys.userSummary(),
    queryFn: getDashboardUserSummary,
    staleTime: DASHBOARD_STALE_TIME_MS,
    enabled: role === "user",
  });
}

export function useDashboardAdminSummary() {
  const role = useAuthStore(selectUserRole);
  return useQuery({
    queryKey: dashboardKeys.adminSummary(),
    queryFn: getDashboardAdminSummary,
    staleTime: DASHBOARD_STALE_TIME_MS,
    enabled: role === "admin" || role === "superAdmin",
  });
}

export function useDashboardSuperAdminSummary() {
  const role = useAuthStore(selectUserRole);
  return useQuery({
    queryKey: dashboardKeys.superAdminSummary(),
    queryFn: getDashboardSuperAdminSummary,
    staleTime: DASHBOARD_STALE_TIME_MS,
    enabled: role === "superAdmin",
  });
}

export function useDashboardPlatformSummary() {
  const role = useAuthStore(selectUserRole);
  return useQuery({
    queryKey: dashboardKeys.platformSummary(),
    queryFn: getPlatformStats,
    staleTime: DASHBOARD_STALE_TIME_MS,
    enabled: role === "platformAdmin",
  });
}
