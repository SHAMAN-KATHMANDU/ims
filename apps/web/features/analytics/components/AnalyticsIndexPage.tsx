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
      className="reports-container min-w-0 w-full max-w-full space-y-8"
      data-reports
    >
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Reports
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">
          Analytics
        </h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base max-w-2xl">
          Choose a report to view detailed analytics and metrics. Key numbers
          are at a glance; drill into each area for trends and breakdowns.
        </p>
      </header>

      <section
        aria-label="Report categories"
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <Link key={r.path} href={r.path} className="block min-w-0 group">
              <Card className="min-w-0 h-full border border-border/80 shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md group-hover:bg-muted/30">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3 pt-5 px-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base font-semibold leading-tight">
                    {r.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0">
                  <CardDescription className="text-sm leading-relaxed">
                    {r.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
