"use client";

import { useQuery } from "@tanstack/react-query";
import { useEnvFeatureFlag } from "@/features/flags";
import { EnvFeature } from "@repo/shared";
import {
  getCrmDashboard,
  getCrmReports,
  exportCrmReports,
} from "../services/crm.service";

import { crmKeys } from "./_query-keys";

export { crmKeys };

export function useCrmDashboard() {
  const crmEnabled = useEnvFeatureFlag(EnvFeature.CRM);
  return useQuery({
    queryKey: crmKeys.dashboard(),
    queryFn: () => getCrmDashboard(),
    staleTime: 60 * 1000,
    enabled: crmEnabled,
  });
}

export function useCrmReports(year?: number) {
  const reportsEnabled = useEnvFeatureFlag(EnvFeature.CRM_REPORTS);
  return useQuery({
    queryKey: crmKeys.reports(year),
    queryFn: () => getCrmReports(year),
    staleTime: 60 * 1000,
    enabled: reportsEnabled,
  });
}

export { exportCrmReports };
