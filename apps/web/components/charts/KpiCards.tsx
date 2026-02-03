"use client";

/**
 * Reusable KPI card grid for analytics. Single place to change card layout/pattern.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface KpiCardItem {
  label: string;
  value: React.ReactNode;
  sublabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface KpiCardsProps {
  items: KpiCardItem[];
  isLoading?: boolean;
  className?: string;
}

export function KpiCards({ items, isLoading, className }: KpiCardsProps) {
  return (
    <div
      className={
        className ??
        "grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 min-w-0"
      }
    >
      {items.map((item, i) => (
        <Card key={i} className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
            {item.icon && (
              <item.icon className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{item.value}</div>
                {item.sublabel && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.sublabel}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
