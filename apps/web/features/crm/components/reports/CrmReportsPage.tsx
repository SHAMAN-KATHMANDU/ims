"use client";

import { useState } from "react";
import { useCrmReports, exportCrmReports } from "../../hooks/use-crm";
import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportsLineChart, ReportsBarChart } from "@/components/reports-charts";
import { useToast } from "@/hooks/useToast";
import { downloadBlob } from "@/lib/downloadBlob";

export function CrmReportsPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { data, isLoading } = useCrmReports(year);
  const { toast } = useToast();

  const d = data?.data;

  const handleExport = async () => {
    try {
      const blob = await exportCrmReports(year);
      downloadBlob(blob, `crm-reports-${year}.xlsx`);
      toast({ title: "Export started" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  if (isLoading || !d) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">CRM Reports</h1>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">CRM Reports</h1>
          <p className="text-muted-foreground">Sales and lead performance</p>
        </div>
        <div className="flex gap-2">
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="rounded-md border px-3 py-2 text-sm"
            aria-label="Year"
          >
            {[year - 2, year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={handleExport}>
            Export Excel
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Deals Won</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{d.dealsWon}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Deals Lost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{d.dealsLost}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(d.totalRevenue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{d.conversionRate}%</div>
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
              data={d.monthlyRevenue}
              series={[{ dataKey: "revenue", label: "Revenue" }]}
              xKey="month"
              height={280}
              formatValue={(n) => formatCurrency(n)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales per User</CardTitle>
            <CardDescription>Deals won and value by assignee</CardDescription>
          </CardHeader>
          <CardContent>
            {d.salesPerUser?.length ? (
              <ReportsBarChart
                data={d.salesPerUser.map((u) => ({
                  username: u.username,
                  value: u.totalValue,
                  userId: u.userId,
                }))}
                valueLabel="Revenue"
                height={280}
                formatValue={(n) => formatCurrency(n)}
              />
            ) : (
              <p className="text-muted-foreground text-sm">No data</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leads by Source</CardTitle>
          <CardDescription>Lead source breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          {d.leadsBySource?.length ? (
            <ReportsBarChart
              data={d.leadsBySource.map((s) => ({
                username: s.source,
                value: s.count,
                userId: s.source,
              }))}
              valueLabel="Count"
              height={280}
            />
          ) : (
            <p className="text-muted-foreground text-sm">No data</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
