"use client";

/**
 * Super Admin dashboard: System KPIs — active users today, workspaces, error reports.
 * Data: useDashboardSuperAdminSummary.
 */

import { KpiCards, type KpiCardItem } from "@/components/charts/KpiCards";
import { useDashboardSuperAdminSummary } from "@/features/dashboard";
import { Users, Building2, Bug, CheckCircle } from "lucide-react";

export const WIDGET_ID = "superadmin-kpi-cards";
export const REQUIRED_ROLES = ["superAdmin"] as const;
export const DATA_SOURCE = "useDashboardSuperAdminSummary";
export const REFRESH_BEHAVIOR = "staleTime 3min";

interface SuperAdminKpiCardsProps {
  basePath: string;
}

export function SuperAdminKpiCards({
  basePath: _basePath,
}: SuperAdminKpiCardsProps) {
  const { data, isLoading } = useDashboardSuperAdminSummary();

  const items: KpiCardItem[] = [
    {
      label: "Active users today",
      value: data?.activeUsersToday ?? 0,
      sublabel: "logged in today",
      icon: Users,
    },
    {
      label: "Total workspaces",
      value: data?.totalWorkspaces ?? 0,
      sublabel: "outlets",
      icon: Building2,
    },
    {
      label: "Error reports (open)",
      value: data?.errorReportsOpen ?? 0,
      sublabel: "needs attention",
      icon: Bug,
    },
    {
      label: "Error reports (resolved)",
      value: data?.errorReportsResolved ?? 0,
      sublabel: "resolved",
      icon: CheckCircle,
    },
  ];

  return (
    <KpiCards
      items={items}
      isLoading={isLoading}
      className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
    />
  );
}
