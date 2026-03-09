"use client";

/**
 * User dashboard: Last N sales (compact list).
 * Data: useDashboardUserSummary (recentSales).
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
import { useDashboardUserSummary } from "@/features/dashboard";
import { formatCurrency } from "@/lib/format";
import { Receipt, ArrowRight } from "lucide-react";

export const WIDGET_ID = "user-recent-sales";
export const REQUIRED_ROLES = ["user"] as const;
export const DATA_SOURCE = "useDashboardUserSummary";
export const REFRESH_BEHAVIOR = "staleTime 3min";

interface UserRecentSalesProps {
  basePath: string;
}

export function UserRecentSales({ basePath }: UserRecentSalesProps) {
  const { data, isLoading } = useDashboardUserSummary();

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent sales</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const sales = data?.recentSales ?? [];

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          Recent sales
        </CardTitle>
        <Link
          href={`${basePath}/sales`}
          className="text-xs font-medium text-primary hover:underline inline-flex items-center"
        >
          View all
          <ArrowRight className="ml-1 h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-2">Your last sales</CardDescription>
        {sales.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sales yet</p>
        ) : (
          <ul className="space-y-2">
            {sales.map((s) => (
              <li
                key={s.id}
                className="flex justify-between items-center text-sm"
              >
                <span className="font-mono text-muted-foreground truncate max-w-[120px]">
                  {s.saleCode}
                </span>
                <span className="font-medium shrink-0 ml-2">
                  {formatCurrency(s.total)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
