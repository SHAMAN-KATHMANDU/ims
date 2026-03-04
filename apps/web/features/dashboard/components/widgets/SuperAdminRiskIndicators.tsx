"use client";

/**
 * Super Admin dashboard: Risk indicators — high discount usage, credit growth delta.
 * Data: useDashboardSuperAdminSummary (riskIndicators).
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardSuperAdminSummary } from "@/features/dashboard";
import { formatCurrency } from "@/lib/format";
import { AlertTriangle, Percent, CreditCard } from "lucide-react";

export const WIDGET_ID = "superadmin-risk-indicators";
export const REQUIRED_ROLES = ["superAdmin"] as const;
export const DATA_SOURCE = "useDashboardSuperAdminSummary";
export const REFRESH_BEHAVIOR = "staleTime 3min";

interface SuperAdminRiskIndicatorsProps {
  basePath: string;
}

export function SuperAdminRiskIndicators({
  basePath: _basePath,
}: SuperAdminRiskIndicatorsProps) {
  const { data, isLoading } = useDashboardSuperAdminSummary();

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Risk indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const risk = data?.riskIndicators ?? {
    highDiscountUsage: 0,
    creditOutstandingDelta: 0,
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          Risk indicators
        </CardTitle>
        <CardDescription>Discount and credit signals</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Percent className="h-4 w-4 text-muted-foreground" />
          <span>Discount (last 7 days):</span>
          <span className="font-medium">
            {formatCurrency(risk.highDiscountUsage)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span>Credit outstanding Δ (vs last week):</span>
          <span
            className={
              risk.creditOutstandingDelta > 0
                ? "font-medium text-amber-600"
                : "font-medium text-muted-foreground"
            }
          >
            {risk.creditOutstandingDelta >= 0 ? "+" : ""}
            {formatCurrency(risk.creditOutstandingDelta)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
