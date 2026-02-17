"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getCrmDashboard,
  getCrmReports,
  exportCrmReports,
} from "@/services/crmService";

export const crmKeys = {
  dashboard: () => ["crm", "dashboard"] as const,
  reports: (year?: number) => ["crm", "reports", year] as const,
};

export function useCrmDashboard() {
  return useQuery({
    queryKey: crmKeys.dashboard(),
    queryFn: () => getCrmDashboard(),
    staleTime: 3 * 60 * 1000,
  });
}

export function useCrmReports(year?: number) {
  return useQuery({
    queryKey: crmKeys.reports(year),
    queryFn: () => getCrmReports(year),
    staleTime: 3 * 60 * 1000,
  });
}

export { exportCrmReports };
