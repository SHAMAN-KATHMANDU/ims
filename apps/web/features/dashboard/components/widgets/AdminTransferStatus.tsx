"use client";

/**
 * Admin dashboard: Transfer status summary (pending, in transit).
 * Data: useDashboardAdminSummary (transferStatusCounts).
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
import { ArrowLeftRight, ArrowRight } from "lucide-react";

export const WIDGET_ID = "admin-transfer-status";
export const REQUIRED_ROLES = ["admin", "superAdmin"] as const;
export const DATA_SOURCE = "useDashboardAdminSummary";
export const REFRESH_BEHAVIOR = "staleTime 3min";

interface AdminTransferStatusProps {
  basePath: string;
}

export function AdminTransferStatus({ basePath }: AdminTransferStatusProps) {
  const { data, isLoading } = useDashboardAdminSummary();

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Transfers</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const counts = data?.transferStatusCounts ?? {
    pending: 0,
    inTransit: 0,
    completed: 0,
    cancelled: 0,
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          Transfer status
        </CardTitle>
        <Link
          href={`${basePath}/transfers`}
          className="text-xs font-medium text-primary hover:underline inline-flex items-center"
        >
          View all
          <ArrowRight className="ml-1 h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-2">Summary</CardDescription>
        <div className="flex flex-wrap gap-4 text-sm">
          <span>
            <strong>Pending:</strong> {counts.pending}
          </span>
          <span>
            <strong>In transit:</strong> {counts.inTransit}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
