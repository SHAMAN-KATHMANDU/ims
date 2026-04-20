"use client";

import type { ReactElement } from "react";
import { Activity, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAutomationAnalytics } from "../hooks/use-automation";

interface StatTileProps {
  icon: React.ElementType;
  label: string;
  value: string;
  className?: string;
}

function StatTile({
  icon: Icon,
  label,
  value,
  className = "",
}: StatTileProps): ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${className}`} aria-hidden />
        {label}
      </div>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

interface AutomationAnalyticsCardProps {
  automationId: string;
}

export function AutomationAnalyticsCard({
  automationId,
}: AutomationAnalyticsCardProps): ReactElement {
  const { data, isLoading } = useAutomationAnalytics(automationId);
  const a = data?.analytics;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Last 7 days</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !a ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile
              icon={Activity}
              label="Runs"
              value={String(a.runsThisWeek)}
            />
            <StatTile
              icon={CheckCircle2}
              label="Success"
              value={`${a.successRate.toFixed(0)}%`}
              className="text-green-600"
            />
            <StatTile
              icon={XCircle}
              label="Failed"
              value={`${a.failureRate.toFixed(0)}%`}
              className="text-red-500"
            />
            <StatTile
              icon={Clock}
              label="Avg duration"
              value={
                a.avgDurationMs != null
                  ? a.avgDurationMs < 1000
                    ? `${Math.round(a.avgDurationMs)}ms`
                    : `${(a.avgDurationMs / 1000).toFixed(1)}s`
                  : "—"
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
