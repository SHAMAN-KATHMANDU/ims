"use client";

/**
 * Admin dashboard: Revenue by location (compact).
 * Data: useDashboardAdminSummary (locationSnapshot).
 */

import { snapWidthPercent } from "@/lib/chart-utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardAdminSummary } from "@/features/dashboard";
import { formatCurrency } from "@/lib/format";
import { BarChart3 } from "lucide-react";

export const WIDGET_ID = "admin-location-snapshot";
export const REQUIRED_ROLES = ["admin", "superAdmin"] as const;
export const DATA_SOURCE = "useDashboardAdminSummary";
export const REFRESH_BEHAVIOR = "staleTime 3min";

interface AdminLocationSnapshotProps {
  basePath: string;
}

export function AdminLocationSnapshot({
  basePath: _basePath,
}: AdminLocationSnapshotProps) {
  const { data, isLoading } = useDashboardAdminSummary();

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Location performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const snapshot = data?.locationSnapshot ?? [];
  const maxRevenue = Math.max(...snapshot.map((s) => s.revenue), 1);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          Revenue by location
        </CardTitle>
        <CardDescription>Today</CardDescription>
      </CardHeader>
      <CardContent>
        {snapshot.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sales today</p>
        ) : (
          <div className="space-y-3">
            {snapshot.map((loc) => (
              <div key={loc.locationId} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium truncate">
                    {loc.locationName}
                  </span>
                  <span className="text-muted-foreground shrink-0 ml-2">
                    {formatCurrency(loc.revenue)}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full overflow-hidden chart-progress-track">
                  <div
                    className="chart-progress-fill rounded-full"
                    data-width={snapWidthPercent(loc.revenue, maxRevenue)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
