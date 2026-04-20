"use client";

/**
 * Admin dashboard: Inventory signals — low stock count.
 * Data: useDashboardAdminSummary (lowStockCount).
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
import { Package, ArrowRight } from "lucide-react";

export const WIDGET_ID = "admin-inventory-signals";
export const REQUIRED_ROLES = ["admin", "superAdmin"] as const;
export const DATA_SOURCE = "useDashboardAdminSummary";
export const REFRESH_BEHAVIOR = "staleTime 3min";

interface AdminInventorySignalsProps {
  basePath: string;
}

export function AdminInventorySignals({
  basePath,
}: AdminInventorySignalsProps) {
  const { data, isLoading } = useDashboardAdminSummary();

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Inventory signals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  const lowStock = data?.lowStockCount ?? 0;

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Package
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          Inventory signals
        </CardTitle>
        <Link
          href={`${basePath}/products?lowStock=1`}
          className="text-xs font-medium text-primary hover:underline inline-flex items-center"
        >
          View low stock
          <ArrowRight className="ml-1 h-3 w-3" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-1">Low stock items</CardDescription>
        <Link
          href={`${basePath}/products?lowStock=1`}
          className="text-2xl font-bold hover:underline text-primary"
        >
          {lowStock}
        </Link>
      </CardContent>
    </Card>
  );
}
