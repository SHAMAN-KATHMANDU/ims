"use client";

/**
 * Super Admin dashboard: Recent critical user actions (audit log).
 * Data: useDashboardSuperAdminSummary (auditInsights).
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
import { useDashboardSuperAdminSummary } from "@/features/dashboard";
import { FileText, ArrowRight } from "lucide-react";

export const WIDGET_ID = "superadmin-audit-insights";
export const REQUIRED_ROLES = ["superAdmin"] as const;
export const DATA_SOURCE = "useDashboardSuperAdminSummary";
export const REFRESH_BEHAVIOR = "staleTime 3min";

interface SuperAdminAuditInsightsProps {
  basePath: string;
}

export function SuperAdminAuditInsights({
  basePath,
}: SuperAdminAuditInsightsProps) {
  const { data, isLoading } = useDashboardSuperAdminSummary();

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Audit insights</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const insights = data?.auditInsights ?? [];

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileText
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          Recent actions
        </CardTitle>
        <Link
          href={`${basePath}/settings/logs`}
          className="text-xs font-medium text-primary hover:underline inline-flex items-center"
        >
          View logs
          <ArrowRight className="ml-1 h-3 w-3" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-2">Last user actions</CardDescription>
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {insights.slice(0, 5).map((log) => (
              <li key={log.id} className="flex justify-between gap-2">
                <span className="text-muted-foreground truncate">
                  {log.username}: {log.action}
                  {log.resource ? ` (${log.resource})` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
