"use client";

/**
 * User dashboard: Personal performance trend (last 7 days).
 * Data: useDashboardUserSummary (personalTrend). Compact line chart.
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TimeSeriesLineChart } from "@/components/charts/TimeSeriesLineChart";
import { useDashboardUserSummary } from "@/features/dashboard";
import { TrendingUp } from "lucide-react";

export const WIDGET_ID = "user-personal-trend";
export const REQUIRED_ROLES = ["user"] as const;
export const DATA_SOURCE = "useDashboardUserSummary";
export const REFRESH_BEHAVIOR = "staleTime 3min";

interface UserPersonalTrendProps {
  basePath: string;
}

export function UserPersonalTrend({
  basePath: _basePath,
}: UserPersonalTrendProps) {
  const { data, isLoading } = useDashboardUserSummary();

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Personal trend</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const trend = data?.personalTrend ?? [];
  const hasData = trend.some((d) => d.revenue > 0 || d.count > 0);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Personal performance
        </CardTitle>
        <CardDescription>Revenue over the last 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            No data for this period
          </div>
        ) : (
          <TimeSeriesLineChart
            data={trend.map((d) => ({ ...d, date: d.date.slice(5) }))}
            series={[
              {
                dataKey: "revenue",
                label: "Revenue",
                color: "hsl(var(--chart-1))",
              },
            ]}
            xKey="date"
            height={200}
            ariaLabel="Personal revenue trend"
          />
        )}
      </CardContent>
    </Card>
  );
}
