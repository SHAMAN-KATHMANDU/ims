"use client";

/**
 * Super Admin dashboard: Data integrity — negative stock count.
 * Data: useDashboardSuperAdminSummary (dataIntegrity).
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
import { Database, ArrowRight } from "lucide-react";

export const WIDGET_ID = "superadmin-data-integrity";
export const REQUIRED_ROLES = ["superAdmin"] as const;
export const DATA_SOURCE = "useDashboardSuperAdminSummary";
export const REFRESH_BEHAVIOR = "staleTime 3min";

interface SuperAdminDataIntegrityProps {
  basePath: string;
}

export function SuperAdminDataIntegrity({
  basePath,
}: SuperAdminDataIntegrityProps) {
  const { data, isLoading } = useDashboardSuperAdminSummary();

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Data integrity</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const integrity = data?.dataIntegrity ?? { negativeStockCount: 0 };
  const hasIssues = (integrity.negativeStockCount ?? 0) > 0;

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          Data integrity
        </CardTitle>
        <Link
          href={`${basePath}/locations`}
          className="text-xs font-medium text-primary hover:underline inline-flex items-center"
        >
          Inventory
          <ArrowRight className="ml-1 h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-1">
          Inventory inconsistencies
        </CardDescription>
        <p className="text-sm">
          {hasIssues ? (
            <span className="font-medium text-amber-600">
              Negative stock: {integrity.negativeStockCount} row(s)
            </span>
          ) : (
            <span className="text-muted-foreground">No issues</span>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
