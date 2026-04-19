"use client";

/**
 * User dashboard: Pending credit payments assigned to me.
 * Data: useDashboardUserSummary (pendingCreditSales). Link to sales filtered by credit.
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
import { CreditCard, ArrowRight } from "lucide-react";

export const WIDGET_ID = "user-pending-credit";
export const REQUIRED_ROLES = ["user"] as const;
export const DATA_SOURCE = "useDashboardUserSummary";
export const REFRESH_BEHAVIOR = "staleTime 3min";

const MAX_ITEMS = 5;

interface UserPendingCreditProps {
  basePath: string;
}

export function UserPendingCredit({ basePath }: UserPendingCreditProps) {
  const { data, isLoading } = useDashboardUserSummary();

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Pending credit</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const list = data?.pendingCreditSales ?? [];
  const count = data?.pendingCreditCount ?? 0;

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CreditCard
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          Pending credit payments
        </CardTitle>
        <Link
          href={`${basePath}/sales?isCreditSale=true`}
          className="text-xs font-medium text-primary hover:underline inline-flex items-center"
        >
          View all
          <ArrowRight className="ml-1 h-3 w-3" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-2">
          {count} sale{count !== 1 ? "s" : ""} with outstanding balance
        </CardDescription>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending credit</p>
        ) : (
          <ul className="space-y-2">
            {list.slice(0, MAX_ITEMS).map((s) => (
              <li key={s.id} className="flex justify-between text-sm">
                <span className="font-mono text-muted-foreground">
                  {s.saleCode}
                </span>
                <span className="font-medium">{formatCurrency(s.balance)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
