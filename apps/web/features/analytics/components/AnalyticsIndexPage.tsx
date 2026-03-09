"use client";

/**
 * Analytics index: landing page with links to all analytics reports.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Receipt,
  Package,
  Users,
  TrendingUp,
  Banknote,
  Handshake,
} from "lucide-react";

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
          "Revenue trends, composition by location and payment, credit analytics, user performance, growth rates, and basket analysis.",
        icon: Receipt,
      },
      {
        path: `${base}/reports/analytics/inventory`,
        title: "Inventory & Operations",
        description:
          "Stock health, aging, turnover ratio, days on hand, dead stock, sell-through by location, and transfer funnel.",
        icon: Package,
      },
      {
        path: `${base}/reports/analytics/customers`,
        title: "Customers & Promotions",
        description:
          "Member insights, CLV, RFM segmentation, retention/churn, product performance, ABC classification, and promo effectiveness.",
        icon: Users,
      },
      {
        path: `${base}/reports/analytics/trends`,
        title: "Trends & Patterns",
        description:
          "MoM growth rates, moving averages, seasonality index, cohort retention matrix, and peak hours heatmap.",
        icon: TrendingUp,
      },
      {
        path: `${base}/reports/analytics/financial`,
        title: "Financial Analytics",
        description:
          "Gross profit over time, COGS breakdown by category and location, discount ratio trends, and margin analysis.",
        icon: Banknote,
      },
      {
        path: `${base}/reports/crm`,
        title: "CRM Reports",
        description:
          "Deals won and lost, revenue, conversion rate, sales per user, and leads by source.",
        icon: Handshake,
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
