"use client";

import {
  useAnalytics,
  type PlatformAnalytics,
} from "@/hooks/usePlatformBilling";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

const PIE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "secondary",
  COMPLETED: "default",
  FAILED: "destructive",
  REFUNDED: "outline",
};

function formatNPR(amount: number) {
  return `NPR ${amount.toLocaleString("en-NP")}`;
}

function KPISkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );
}

function KPICards({ analytics }: { analytics: PlatformAnalytics }) {
  const kpis = [
    {
      title: "Total Revenue",
      value: formatNPR(analytics.revenue.total),
      accent: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Active Subscriptions",
      value: analytics.subscriptions.active.toLocaleString(),
      accent: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Pending Payments",
      value: analytics.payments.pending.toLocaleString(),
      accent: "text-amber-600 dark:text-amber-400",
    },
    {
      title: "Trial Tenants",
      value: analytics.subscriptions.trial.toLocaleString(),
      accent: "text-violet-600 dark:text-violet-400",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {kpi.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold tracking-tight ${kpi.accent}`}>
              {kpi.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RevenueChart({
  monthly,
}: {
  monthly: PlatformAnalytics["revenue"]["monthly"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Revenue</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: number) => [formatNPR(value), "Revenue"]}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--popover))",
                color: "hsl(var(--popover-foreground))",
              }}
            />
            <Bar
              dataKey="revenue"
              fill="hsl(var(--chart-1))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function PlanDistributionChart({
  data,
}: {
  data: PlatformAnalytics["tenants"]["planDistribution"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="plan"
              cx="50%"
              cy="50%"
              outerRadius={100}
              innerRadius={50}
              paddingAngle={2}
              label={({ plan, count }) => `${plan} (${count})`}
              labelLine={{ strokeWidth: 1 }}
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--popover))",
                color: "hsl(var(--popover-foreground))",
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function TenantGrowthChart({
  data,
}: {
  data: PlatformAnalytics["tenants"]["growth"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tenant Growth</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
              allowDecimals={false}
            />
            <Tooltip
              formatter={(value: number) => [value, "New Tenants"]}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--popover))",
                color: "hsl(var(--popover-foreground))",
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              dot={{ r: 4, fill: "hsl(var(--chart-2))" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function GatewayBreakdown({
  data,
}: {
  data: PlatformAnalytics["payments"]["byGateway"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Gateway Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              type="number"
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category"
              dataKey="gateway"
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
              width={100}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                name === "total" ? formatNPR(value) : value,
                name === "total" ? "Total Amount" : "Transactions",
              ]}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--popover))",
                color: "hsl(var(--popover-foreground))",
              }}
            />
            <Legend />
            <Bar
              dataKey="total"
              fill="hsl(var(--chart-3))"
              radius={[0, 4, 4, 0]}
              name="Total Amount"
            />
            <Bar
              dataKey="count"
              fill="hsl(var(--chart-4))"
              radius={[0, 4, 4, 0]}
              name="Transactions"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function RecentPayments({
  payments,
}: {
  payments: PlatformAnalytics["payments"]["recent"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Payments</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Gateway</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-8"
                >
                  No recent payments
                </TableCell>
              </TableRow>
            ) : (
              payments.slice(0, 10).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.tenant?.name ?? "—"}
                  </TableCell>
                  <TableCell>{formatNPR(Number(p.amount))}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{p.gateway}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[p.status] ?? "secondary"}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function AnalyticsTab() {
  const { data: analytics, isLoading } = useAnalytics();

  if (isLoading || !analytics) {
    return (
      <div className="space-y-6">
        <KPISkeleton />
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <KPICards analytics={analytics} />

      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueChart monthly={analytics.revenue.monthly} />
        <PlanDistributionChart data={analytics.tenants.planDistribution} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TenantGrowthChart data={analytics.tenants.growth} />
        <GatewayBreakdown data={analytics.payments.byGateway} />
      </div>

      <RecentPayments payments={analytics.payments.recent} />
    </div>
  );
}
