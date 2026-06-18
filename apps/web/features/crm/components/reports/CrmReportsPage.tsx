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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReportsLineChart, ReportsBarChart } from "@/components/reports-charts";
import { StaffActivityChart } from "./StaffActivityChart";
import { useToast } from "@/hooks/useToast";
import { downloadBlob } from "@/lib/downloadBlob";
import { KpiCard } from "../shared";
import { Users, Bot } from "lucide-react";

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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <div className="flex-1">
              <CardTitle>Staff activity · this month</CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Bot className="h-3 w-3" />
            <span>via crm_staff_activity</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <StaffActivityChart data={d.staffPerformance || []} />

          {d.staffPerformance?.length ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rep</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Emails</TableHead>
                    <TableHead className="text-right">Meetings</TableHead>
                    <TableHead className="text-right">Deals won</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.staffPerformance.map((staff) => {
                    const initials = staff.username
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase();

                    return (
                      <TableRow key={staff.userId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                              {initials}
                            </div>
                            <span className="text-sm">{staff.username}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {staff.calls}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {staff.emails}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {staff.meetings}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {staff.dealCount}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(staff.totalValue)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No staff data</p>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard
              label="Total deals won"
              value={
                d.staffPerformance?.reduce((sum, s) => sum + s.dealCount, 0) ||
                0
              }
            />
            <KpiCard
              label="Activities logged"
              value={
                d.staffPerformance?.reduce(
                  (sum, s) => sum + s.calls + s.emails + s.meetings,
                  0,
                ) || 0
              }
            />
            <KpiCard label="Avg. deal cycle" value="—" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
