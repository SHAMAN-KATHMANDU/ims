"use client";

/**
 * Admin dashboard: Alerts — low stock, overdue credit, failed transfers.
 * Data: useDashboardAdminSummary (alerts). Compact list with links.
 */

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardAdminSummary } from "@/features/dashboard";
import { AlertTriangle, Package, CreditCard, Truck } from "lucide-react";

export const WIDGET_ID = "admin-alerts";
export const REQUIRED_ROLES = ["admin", "superAdmin"] as const;
export const DATA_SOURCE = "useDashboardAdminSummary";
export const REFRESH_BEHAVIOR = "staleTime 3min";

interface AdminAlertsProps {
  basePath: string;
}

export function AdminAlerts({ basePath }: AdminAlertsProps) {
  const { data, isLoading } = useDashboardAdminSummary();

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const alerts = data?.alerts ?? {
    lowStockCount: 0,
    overdueCreditCount: 0,
    failedTransferCount: 0,
  };
  const hasAlerts =
    (alerts.lowStockCount ?? 0) > 0 ||
    (alerts.overdueCreditCount ?? 0) > 0 ||
    (alerts.failedTransferCount ?? 0) > 0;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          Alerts
        </CardTitle>
        <CardDescription>Items needing attention</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasAlerts ? (
          <p className="text-sm text-muted-foreground">No alerts</p>
        ) : (
          <ul className="space-y-2">
            {(alerts.lowStockCount ?? 0) > 0 && (
              <li>
                <Link
                  href={`${basePath}/product?lowStock=1`}
                  className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-2"
                >
                  <Package className="h-4 w-4" />
                  Low stock: {alerts.lowStockCount} item(s)
                </Link>
              </li>
            )}
            {(alerts.overdueCreditCount ?? 0) > 0 && (
              <li>
                <Link
                  href={`${basePath}/sales?credit=credit`}
                  className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  Overdue credit: {alerts.overdueCreditCount} sale(s)
                </Link>
              </li>
            )}
            {(alerts.failedTransferCount ?? 0) > 0 && (
              <li>
                <Link
                  href={`${basePath}/transfers`}
                  className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-2"
                >
                  <Truck className="h-4 w-4" />
                  Cancelled transfers: {alerts.failedTransferCount}
                </Link>
              </li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
