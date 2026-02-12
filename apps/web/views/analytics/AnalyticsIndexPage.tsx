"use client";

/**
 * Analytics index: landing page with links to Sales & Revenue, Inventory & Operations,
 * and Customers & Promotions reports.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Package, Users, Receipt } from "lucide-react";
import { useMemo } from "react";

export function AnalyticsIndexPage() {
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const base = `/${workspace}`;

  const reports = useMemo(
    () => [
      {
        path: `${base}/reports/analytics/sales`,
        title: "Sales & Revenue",
        description:
          "Revenue over time, composition by location and payment, credit analytics, and user performance.",
        icon: Receipt,
      },
      {
        path: `${base}/reports/analytics/inventory`,
        title: "Inventory & Operations",
        description:
          "Stock value, health quadrant, heatmap by category and location, aging, and transfer funnel.",
        icon: Package,
      },
      {
        path: `${base}/reports/analytics/customers`,
        title: "Customers & Promotions",
        description:
          "Member KPIs, product performance, promo effectiveness and cohort insights.",
        icon: Users,
      },
    ],
    [base],
  );

  return (
    <div
      className="reports-container min-w-0 w-full max-w-full space-y-6"
      data-reports
    >
      <header>
        <h1 className="text-2xl font-bold text-balance md:text-3xl">
          Analytics
        </h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Choose a report to view detailed analytics and metrics.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <Link key={r.path} href={r.path} className="block min-w-0">
              <Card className="min-w-0 shadow-sm transition-colors hover:bg-muted/50 h-full">
                <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{r.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {r.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
