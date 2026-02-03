"use client";

/**
 * User dashboard: My sales today, my revenue today, my credit outstanding.
 * Data: useDashboardUserSummary. Visibility determined by registry, not role check here.
 */

import { KpiCards, type KpiCardItem } from "@/components/charts/KpiCards";
import { useDashboardUserSummary } from "@/hooks/useDashboard";
import { formatCurrency } from "@/lib/format";
import { Receipt, DollarSign, CreditCard } from "lucide-react";

export const WIDGET_ID = "user-kpi-cards";
export const REQUIRED_ROLES = ["user"] as const;
export const DATA_SOURCE = "useDashboardUserSummary";
export const REFRESH_BEHAVIOR = "staleTime 3min";

interface UserKpiCardsProps {
  basePath: string;
}

export function UserKpiCards({ basePath: _basePath }: UserKpiCardsProps) {
  const { data, isLoading } = useDashboardUserSummary();

  const items: KpiCardItem[] = [
    {
      label: "My sales today",
      value: data?.mySalesToday ?? 0,
      sublabel: "sales",
      icon: Receipt,
    },
    {
      label: "My revenue today",
      value: formatCurrency(data?.myRevenueToday ?? 0),
      sublabel: "today",
      icon: DollarSign,
    },
    {
      label: "My credit outstanding",
      value: formatCurrency(data?.myCreditOutstanding ?? 0),
      sublabel: "credit sales balance",
      icon: CreditCard,
    },
  ];

  return (
    <KpiCards
      items={items}
      isLoading={isLoading}
      className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
    />
  );
}
