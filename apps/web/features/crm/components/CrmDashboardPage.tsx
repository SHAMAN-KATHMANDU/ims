"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useCrmDashboard } from "@/features/crm/hooks/use-crm";
import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Handshake, Target, CheckSquare } from "lucide-react";
import { ReportsLineChart } from "@/components/reports-charts";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";

export function CrmDashboardPage() {
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;

  const { data, isLoading } = useCrmDashboard();
  const d = data?.data;

  if (isLoading || !d) {
    return (
      <PageShell className="space-y-6">
        <PageHeader
          title="CRM Overview"
          description="Sales overview and key metrics"
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-6">
      <PageHeader
        title="CRM Overview"
        description="Sales overview and key metrics"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Deals Value
            </CardTitle>
            <Handshake
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(d.totalDealsValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Sum of all open deals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Deals Closing This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{d.dealsClosingThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              Expected close this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tasks Due Today
            </CardTitle>
            <CheckSquare
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{d.tasksDueToday}</div>
            <Link href={`${basePath}/crm/tasks?dueToday=true`}>
              <Button variant="link" className="h-auto p-0 text-xs">
                View tasks
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Lead Conversion Rate
            </CardTitle>
            <Target
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{d.leadConversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {d.convertedLeads} / {d.totalLeads} leads converted
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
            <CardDescription>Deals won by month</CardDescription>
          </CardHeader>
          <CardContent>
            <ReportsLineChart
              data={d.monthlyRevenueChart}
              series={[{ dataKey: "revenue", label: "Revenue" }]}
              xKey="month"
              height={280}
              formatValue={(n) => formatCurrency(n)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity Summary</CardTitle>
            <CardDescription>Recent calls and meetings</CardDescription>
          </CardHeader>
          <CardContent>
            {d.activitySummary?.length ? (
              <ul className="space-y-3 max-h-[280px] overflow-y-auto">
                {d.activitySummary.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start gap-2 text-sm border-b pb-2 last:border-0"
                  >
                    <span className="font-medium capitalize">{a.type}</span>
                    <span className="text-muted-foreground">
                      {a.contact
                        ? `${a.contact.firstName} ${a.contact.lastName || ""}`
                        : a.deal?.name || "—"}{" "}
                      · {new Date(a.activityAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">
                No recent activity
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
