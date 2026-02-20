"use client";

import { useTenants } from "@/hooks/useTenant";
import { usePlanLimits } from "@/hooks/usePlatformBilling";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  TRIAL: "secondary",
  ACTIVE: "default",
  PAST_DUE: "outline",
  SUSPENDED: "destructive",
  LOCKED: "destructive",
  CANCELLED: "destructive",
};

export function TenantOverviewTab() {
  const { data: tenants = [], isLoading } = useTenants();
  const { data: planLimits = [] } = usePlanLimits();

  const limitsMap = Object.fromEntries(planLimits.map((pl) => [pl.tier, pl]));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Tenants</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Locations</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Expires</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground py-8"
                >
                  No tenants found
                </TableCell>
              </TableRow>
            ) : (
              tenants.map((t) => {
                const limits = limitsMap[t.plan];
                return (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{t.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.slug}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.plan}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          STATUS_VARIANT[t.subscriptionStatus] ?? "secondary"
                        }
                      >
                        {t.subscriptionStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {t._count?.users ?? 0}
                      {limits && limits.maxUsers !== -1 && (
                        <span className="text-muted-foreground text-xs">
                          /{limits.maxUsers}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {t._count?.products ?? 0}
                      {limits && limits.maxProducts !== -1 && (
                        <span className="text-muted-foreground text-xs">
                          /{limits.maxProducts}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {t._count?.locations ?? 0}
                      {limits && limits.maxLocations !== -1 && (
                        <span className="text-muted-foreground text-xs">
                          /{limits.maxLocations}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {t._count?.members ?? 0}
                      {limits && limits.maxMembers !== -1 && (
                        <span className="text-muted-foreground text-xs">
                          /{limits.maxMembers}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.planExpiresAt
                        ? new Date(t.planExpiresAt).toLocaleDateString()
                        : t.isTrial && t.trialEndsAt
                          ? `Trial: ${new Date(t.trialEndsAt).toLocaleDateString()}`
                          : "-"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
