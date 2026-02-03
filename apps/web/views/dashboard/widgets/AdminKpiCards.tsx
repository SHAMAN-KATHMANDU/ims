"use client";

/**
 * Admin dashboard: Business KPIs — today's revenue, net revenue, credit outstanding, inventory value.
 * Data: useDashboardAdminSummary.
 */

import { KpiCards, type KpiCardItem } from "@/components/charts/KpiCards";
import { useDashboardAdminSummary } from "@/hooks/useDashboard";
import { formatCurrency } from "@/lib/format";
import { DollarSign, CreditCard, Package, TrendingUp } from "lucide-react";

export const WIDGET_ID = "admin-kpi-cards";
export const REQUIRED_ROLES = ["admin", "superAdmin"] as const;
export const DATA_SOURCE = "useDashboardAdminSummary";
export const REFRESH_BEHAVIOR = "staleTime 3min";

interface AdminKpiCardsProps {
  basePath: string;
}

export function AdminKpiCards({ basePath: _basePath }: AdminKpiCardsProps) {
  const { data, isLoading } = useDashboardAdminSummary();

  const items: KpiCardItem[] = [
    {
      label: "Today's revenue",
      value: formatCurrency(data?.todayRevenue ?? 0),
      sublabel: "total sales today",
      icon: DollarSign,
    },
    {
      label: "Net revenue",
      value: formatCurrency(data?.netRevenue ?? 0),
      sublabel: "today",
      icon: TrendingUp,
    },
    {
      label: "Credit outstanding",
      value: formatCurrency(data?.creditOutstanding ?? 0),
      sublabel: "unpaid credit sales",
      icon: CreditCard,
    },
    {
      label: "Inventory value",
      value: formatCurrency(data?.inventoryValue ?? 0),
      sublabel: "at cost",
      icon: Package,
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
