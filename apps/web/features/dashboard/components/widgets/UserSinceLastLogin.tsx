"use client";

/**
 * User dashboard: Since last login — sales count and revenue.
 * Data: useDashboardUserSummary (sinceLastLogin). No extra request.
 */

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
import { LogIn } from "lucide-react";

export const WIDGET_ID = "user-since-last-login";
export const REQUIRED_ROLES = ["user"] as const;
export const DATA_SOURCE = "useDashboardUserSummary";
export const REFRESH_BEHAVIOR = "staleTime 3min";

interface UserSinceLastLoginProps {
  basePath: string;
}

export function UserSinceLastLogin({
  basePath: _basePath,
}: UserSinceLastLoginProps) {
  const { data, isLoading } = useDashboardUserSummary();

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <LogIn className="h-4 w-4 text-muted-foreground" />
            Since last login
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-24 mt-2" />
        </CardContent>
      </Card>
    );
  }

  const since = data?.sinceLastLogin;
  const count = since?.salesCount ?? 0;
  const revenue = since?.revenue ?? 0;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <LogIn className="h-4 w-4 text-muted-foreground" />
          Since last login
        </CardTitle>
        <CardDescription>
          Sales and revenue since you last signed in
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(revenue)}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {count} sale{count !== 1 ? "s" : ""}
        </p>
      </CardContent>
    </Card>
  );
}
