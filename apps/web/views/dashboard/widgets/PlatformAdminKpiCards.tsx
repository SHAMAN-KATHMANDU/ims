"use client";

/**
 * Platform Admin dashboard: Platform-wide KPIs — tenants, users, sales.
 * Data: useDashboardPlatformSummary.
 */

import { KpiCards, type KpiCardItem } from "@/components/charts/KpiCards";
import { useDashboardPlatformSummary } from "@/hooks/useDashboard";
import { Building2, CheckCircle, Clock, Users, Receipt } from "lucide-react";

export const WIDGET_ID = "platformadmin-kpi-cards";
export const REQUIRED_ROLES = ["platformAdmin"] as const;
export const DATA_SOURCE = "useDashboardPlatformSummary";
export const REFRESH_BEHAVIOR = "staleTime 3min";

interface PlatformAdminKpiCardsProps {
  basePath: string;
}

export function PlatformAdminKpiCards({
  basePath: _basePath,
}: PlatformAdminKpiCardsProps) {
  const { data, isLoading } = useDashboardPlatformSummary();

  const items: KpiCardItem[] = [
    {
      label: "Total tenants",
      value: data?.totalTenants ?? 0,
      sublabel: "all workspaces",
      icon: Building2,
    },
    {
      label: "Active tenants",
      value: data?.activeTenants ?? 0,
      sublabel: "enabled",
      icon: CheckCircle,
    },
    {
      label: "Trial tenants",
      value: data?.trialTenants ?? 0,
      sublabel: "on trial",
      icon: Clock,
    },
    {
      label: "Total users",
      value: data?.totalUsers ?? 0,
      sublabel: "across all tenants",
      icon: Users,
    },
    {
      label: "Total sales",
      value: data?.totalSales ?? 0,
      sublabel: "platform-wide",
      icon: Receipt,
    },
  ];

  return (
    <KpiCards
      items={items}
      isLoading={isLoading}
      className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"
    />
  );
}
