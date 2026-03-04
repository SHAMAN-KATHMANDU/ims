"use client";

/**
 * Customers, Products & Promotions Analytics. Member KPIs, CLV, RFM, ABC, co-purchase, promo effectiveness.
 */

import { useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  AreaChart,
  Area,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useAnalyticsFilters } from "@/features/analytics";
import {
  useCustomersPromosAnalytics,
  useMemberCohortAnalytics,
  useCustomerInsightsAnalytics,
  useProductInsightsAnalytics,
} from "@/features/analytics";
import { AnalyticsFilterBar } from "./components/AnalyticsFilterBar";
import { exportAnalytics } from "@/features/analytics";
import { downloadBlobFromResponse } from "@/lib/downloadBlob";
import {
  C,
  getChartColor,
  fN,
  fS,
  fP,
  tooltipStyle,
  axisTick,
  gridProps,
  type ChartTooltipProps,
  type ChartTooltipPayloadItem,
} from "./reportTheme";

const DarkTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (!active || !payload) return null;
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 600, color: C.text, marginBottom: 6 }}>
        {label}
      </div>
      {payload.map((p: ChartTooltipPayloadItem, i: number) => (
        <div key={i} style={{ color: p.color || C.text, marginBottom: 2 }}>
          {p.name}: {typeof p.value === "number" ? fN(p.value) : p.value}
        </div>
      ))}
    </div>
  );
};

const RFM_COLORS: Record<string, string> = {
  Champions: C.gongabu,
  Loyal: C.thamel,
  "New Customers": C.online,
  "Potential Loyalists": C.teal,
  "Need Attention": C.gold,
  "At Risk": C.rubys,
  Lost: C.red,
};

export function CustomersPromosPage() {
  const { apiParams } = useAnalyticsFilters();
  const { data, isLoading } = useCustomersPromosAnalytics(apiParams);
  const { data: cohortData } = useMemberCohortAnalytics(apiParams);
  const { data: custData, isLoading: custLoading } =
    useCustomerInsightsAnalytics(apiParams);
  const { data: prodData, isLoading: prodLoading } =
    useProductInsightsAnalytics(apiParams);
  const [view, setView] = useState<"customers" | "products" | "promos">(
    "customers",
  );
  const [exporting, setExporting] = useState(false);
  const PAGE_SIZE = 10;
  const [rfmPage, setRfmPage] = useState(1);
  const [coPurchasePage, setCoPurchasePage] = useState(1);
  const [productPerfPage, setProductPerfPage] = useState(1);
  const [promosPage, setPromosPage] = useState(1);

  const handleExport = useCallback(
    async (format: "csv" | "excel") => {
      setExporting(true);
      try {
        const response = await exportAnalytics(
          "customers-promos",
          format,
          apiParams,
        );
        downloadBlobFromResponse(
          response,
          `analytics-customers-${new Date().toISOString().slice(0, 10)}.${format === "excel" ? "xlsx" : "csv"}`,
        );
      } catch {
        /* handled */
      }
      setExporting(false);
    },
    [apiParams],
  );

  const loading = isLoading || custLoading || prodLoading;

  const kpis =
    data && custData
      ? [
          {
            label: "Total Members",
            value: String(data.memberKpis.totalMembers),
            sub: "All time",
            icon: "👥",
          },
          {
            label: "New in Period",
            value: String(data.memberKpis.newInPeriod),
            sub: "Members joined",
            icon: "🆕",
          },
          {
            label: "Repeat %",
            value: fP(data.memberKpis.repeatPercent),
            sub: "With >1 sale",
            icon: "🔄",
          },
          {
            label: "Avg CLV",
            value: fN(custData.avgClv),
            sub: "Lifetime value",
            icon: "💎",
          },
          {
            label: "Retention Rate",
            value: fP(custData.retentionRate),
            sub: "Period over period",
            icon: "📈",
          },
          {
            label: "Churn Rate",
            value: fP(custData.churnRate),
            sub: "Lost customers",
            icon: "📉",
          },
          {
            label: "Avg Order Freq",
            value: `${custData.avgOrderFrequencyDays}d`,
            sub: "Between purchases",
            icon: "⏱️",
          },
          {
            label: "New vs Repeat Rev",
            value: cohortData
              ? `${Math.round((cohortData.repeatRevenue / (cohortData.newRevenue + cohortData.repeatRevenue || 1)) * 100)}% repeat`
              : "—",
            sub: "Revenue split",
            icon: "💰",
          },
        ]
      : [];

  return (
    <div
      className="reports-container min-w-0 w-full max-w-full space-y-6"
      data-reports
    >
      <header>
        <h1 className="text-2xl font-bold text-balance md:text-3xl">
          Customers, Products & Promotions Analytics
        </h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Member insights, product performance, and promotion effectiveness
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <AnalyticsFilterBar />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExport("excel")}
          disabled={exporting}
        >
          {exporting ? "..." : "Export Excel"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExport("csv")}
          disabled={exporting}
        >
          {exporting ? "..." : "Export CSV"}
        </Button>
      </div>

      {!loading && kpis.length > 0 && (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {kpis.map((k, i) => (
            <Card key={i} className="min-w-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{k.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{k.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {loading && <Skeleton className="h-64 w-full" />}

      {!loading && (
        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="promos">Promos</TabsTrigger>
          </TabsList>

          <TabsContent value="customers" className="space-y-6 mt-6">
            {custData && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="min-w-0">
                    <CardHeader>
                      <CardTitle>RFM Segmentation</CardTitle>
                      <CardDescription>
                        Recency × Frequency × Monetary scoring
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart
                          data={custData.rfmSegments.sort(
                            (a, b) => b.count - a.count,
                          )}
                        >
                          <CartesianGrid {...gridProps} />
                          <XAxis dataKey="segment" tick={axisTick} />
                          <YAxis tick={axisTick} />
                          <Tooltip content={<DarkTooltip />} />
                          <Bar
                            dataKey="count"
                            radius={[4, 4, 0, 0]}
                            name="Members"
                          >
                            {custData.rfmSegments
                              .sort((a, b) => b.count - a.count)
                              .map((s, i) => (
                                <Cell
                                  key={i}
                                  fill={
                                    RFM_COLORS[s.segment] ?? getChartColor(i)
                                  }
                                />
                              ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card className="min-w-0">
                    <CardHeader>
                      <CardTitle>CLV Distribution</CardTitle>
                      <CardDescription>
                        Distribution of member lifetime values
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={custData.clvDistribution}>
                          <CartesianGrid {...gridProps} />
                          <XAxis dataKey="range" tick={axisTick} />
                          <YAxis tick={axisTick} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Bar
                            dataKey="count"
                            fill={C.teal}
                            radius={[4, 4, 0, 0]}
                            name="Members"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="min-w-0">
                    <CardHeader>
                      <CardTitle>Member Growth</CardTitle>
                      <CardDescription>New members by month</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={custData.memberGrowth}>
                          <defs>
                            <linearGradient id="mg" x1="0" y1="0" x2="0" y2="1">
                              <stop
                                offset="5%"
                                stopColor={C.gongabu}
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="95%"
                                stopColor={C.gongabu}
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid {...gridProps} />
                          <XAxis dataKey="month" tick={axisTick} />
                          <YAxis tick={axisTick} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Area
                            type="monotone"
                            dataKey="count"
                            stroke={C.gongabu}
                            fill="url(#mg)"
                            strokeWidth={2}
                            name="New Members"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card className="min-w-0">
                    <CardHeader>
                      <CardTitle>New vs Returning Revenue</CardTitle>
                      <CardDescription>
                        Revenue from new vs returning customers
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={custData.newVsReturningTimeSeries}>
                          <CartesianGrid {...gridProps} />
                          <XAxis dataKey="month" tick={axisTick} />
                          <YAxis tickFormatter={fS} tick={axisTick} />
                          <Tooltip content={<DarkTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar
                            dataKey="newRevenue"
                            stackId="a"
                            fill={C.online}
                            name="New"
                          />
                          <Bar
                            dataKey="returningRevenue"
                            stackId="a"
                            fill={C.thamel}
                            radius={[4, 4, 0, 0]}
                            name="Returning"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <Card className="min-w-0">
                  <CardHeader>
                    <CardTitle>RFM Segment Details</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    {(() => {
                      const sorted = [...custData.rfmSegments].sort(
                        (a, b) => b.revenue - a.revenue,
                      );
                      const totalPages = Math.max(
                        1,
                        Math.ceil(sorted.length / PAGE_SIZE),
                      );
                      const page = Math.min(rfmPage, totalPages);
                      const rows = sorted.slice(
                        (page - 1) * PAGE_SIZE,
                        page * PAGE_SIZE,
                      );
                      return (
                        <>
                          <table className="w-full border-collapse text-sm">
                            <thead>
                              <tr className="border-b">
                                {[
                                  "Segment",
                                  "Members",
                                  "Revenue",
                                  "Avg Revenue",
                                ].map((h) => (
                                  <th
                                    key={h}
                                    className={
                                      h === "Segment"
                                        ? "text-left p-2 font-medium"
                                        : "text-right p-2 font-medium"
                                    }
                                  >
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((s) => (
                                <tr
                                  key={s.segment}
                                  className="border-b border-border/50"
                                >
                                  <td className="p-2">
                                    <span className="inline-flex items-center gap-2">
                                      <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{
                                          backgroundColor:
                                            RFM_COLORS[s.segment] ?? C.tm,
                                        }}
                                      />
                                      <span className="font-medium">
                                        {s.segment}
                                      </span>
                                    </span>
                                  </td>
                                  <td className="text-right p-2 text-muted-foreground tabular-nums">
                                    {s.count}
                                  </td>
                                  <td className="text-right p-2 text-muted-foreground tabular-nums">
                                    {fN(s.revenue)}
                                  </td>
                                  <td className="text-right p-2 text-muted-foreground tabular-nums">
                                    {s.count > 0
                                      ? fN(Math.round(s.revenue / s.count))
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {totalPages > 1 && (
                            <Pagination className="mt-4">
                              <PaginationContent>
                                <PaginationItem>
                                  <PaginationPrevious
                                    onClick={() =>
                                      setRfmPage((p) => Math.max(1, p - 1))
                                    }
                                    className={
                                      page <= 1
                                        ? "pointer-events-none opacity-50"
                                        : "cursor-pointer"
                                    }
                                  />
                                </PaginationItem>
                                <PaginationItem>
                                  <span className="px-2 text-sm text-muted-foreground">
                                    Page {page} of {totalPages}
                                  </span>
                                </PaginationItem>
                                <PaginationItem>
                                  <PaginationNext
                                    onClick={() =>
                                      setRfmPage((p) =>
                                        Math.min(totalPages, p + 1),
                                      )
                                    }
                                    className={
                                      page >= totalPages
                                        ? "pointer-events-none opacity-50"
                                        : "cursor-pointer"
                                    }
                                  />
                                </PaginationItem>
                              </PaginationContent>
                            </Pagination>
                          )}
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="products" className="space-y-6 mt-6">
            {prodData && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="min-w-0">
                    <CardHeader>
                      <CardTitle>ABC Classification</CardTitle>
                      <CardDescription>
                        A = top 80% revenue, B = next 15%, C = rest
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart
                          data={prodData.abcClassification.slice(0, 20)}
                        >
                          <CartesianGrid {...gridProps} />
                          <XAxis
                            dataKey="name"
                            tick={axisTick}
                            interval={0}
                            angle={-30}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis tickFormatter={fS} tick={axisTick} />
                          <Tooltip content={<DarkTooltip />} />
                          <Bar
                            dataKey="revenue"
                            radius={[4, 4, 0, 0]}
                            name="Revenue"
                          >
                            {prodData.abcClassification
                              .slice(0, 20)
                              .map((p, i) => (
                                <Cell
                                  key={i}
                                  fill={
                                    p.grade === "A"
                                      ? C.gongabu
                                      : p.grade === "B"
                                        ? C.gold
                                        : C.red
                                  }
                                />
                              ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="flex justify-center gap-4 mt-2 text-xs">
                        {[
                          { label: "A (top 80%)", color: C.gongabu },
                          { label: "B (next 15%)", color: C.gold },
                          { label: "C (rest)", color: C.red },
                        ].map((g) => (
                          <div
                            key={g.label}
                            className="flex items-center gap-1.5"
                          >
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: g.color }}
                            />
                            <span className="text-muted-foreground">
                              {g.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="min-w-0">
                    <CardHeader>
                      <CardTitle>Revenue by Category</CardTitle>
                      <CardDescription>
                        Revenue and margin by product category
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={prodData.revenueByCategory}
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={82}
                            paddingAngle={3}
                            dataKey="revenue"
                            nameKey="category"
                            animationDuration={800}
                          >
                            {prodData.revenueByCategory.map((_, i) => (
                              <Cell
                                key={i}
                                fill={getChartColor(i)}
                                stroke={C.bg}
                                strokeWidth={2}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v: number) => fN(v)}
                            contentStyle={tooltipStyle}
                          />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {prodData.coPurchasePairs.length > 0 && (
                  <Card className="min-w-0">
                    <CardHeader>
                      <CardTitle>Co-Purchase Analysis</CardTitle>
                      <CardDescription>
                        Products frequently bought together
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      {(() => {
                        const list = prodData.coPurchasePairs;
                        const totalPages = Math.max(
                          1,
                          Math.ceil(list.length / PAGE_SIZE),
                        );
                        const page = Math.min(coPurchasePage, totalPages);
                        const rows = list.slice(
                          (page - 1) * PAGE_SIZE,
                          page * PAGE_SIZE,
                        );
                        return (
                          <>
                            <table className="w-full border-collapse text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left p-2 font-medium">
                                    Product 1
                                  </th>
                                  <th className="text-left p-2 font-medium">
                                    Product 2
                                  </th>
                                  <th className="text-right p-2 font-medium">
                                    Frequency
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((pair, i) => (
                                  <tr
                                    key={`co-${(page - 1) * PAGE_SIZE + i}`}
                                    className="border-b border-border/50"
                                  >
                                    <td className="p-2">
                                      {pair.product1.name}
                                    </td>
                                    <td className="p-2">
                                      {pair.product2.name}
                                    </td>
                                    <td className="text-right p-2 font-semibold text-primary tabular-nums">
                                      {pair.frequency}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {totalPages > 1 && (
                              <Pagination className="mt-4">
                                <PaginationContent>
                                  <PaginationItem>
                                    <PaginationPrevious
                                      onClick={() =>
                                        setCoPurchasePage((p) =>
                                          Math.max(1, p - 1),
                                        )
                                      }
                                      className={
                                        page <= 1
                                          ? "pointer-events-none opacity-50"
                                          : "cursor-pointer"
                                      }
                                    />
                                  </PaginationItem>
                                  <PaginationItem>
                                    <span className="px-2 text-sm text-muted-foreground">
                                      Page {page} of {totalPages}
                                    </span>
                                  </PaginationItem>
                                  <PaginationItem>
                                    <PaginationNext
                                      onClick={() =>
                                        setCoPurchasePage((p) =>
                                          Math.min(totalPages, p + 1),
                                        )
                                      }
                                      className={
                                        page >= totalPages
                                          ? "pointer-events-none opacity-50"
                                          : "cursor-pointer"
                                      }
                                    />
                                  </PaginationItem>
                                </PaginationContent>
                              </Pagination>
                            )}
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>
                )}

                {data?.productPerformance &&
                  data.productPerformance.length > 0 && (
                    <Card className="min-w-0">
                      <CardHeader>
                        <CardTitle>Product Performance</CardTitle>
                        <CardDescription>
                          Revenue, quantity, and margin per product
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        {(() => {
                          const sorted = [...data.productPerformance].sort(
                            (a, b) => b.revenue - a.revenue,
                          );
                          const totalPages = Math.max(
                            1,
                            Math.ceil(sorted.length / PAGE_SIZE),
                          );
                          const page = Math.min(productPerfPage, totalPages);
                          const rows = sorted.slice(
                            (page - 1) * PAGE_SIZE,
                            page * PAGE_SIZE,
                          );
                          return (
                            <>
                              <table className="w-full border-collapse text-sm">
                                <thead>
                                  <tr className="border-b sticky top-0 bg-card">
                                    <th className="text-left p-2 font-medium">
                                      Product
                                    </th>
                                    <th className="text-right p-2 font-medium">
                                      Qty
                                    </th>
                                    <th className="text-right p-2 font-medium">
                                      Revenue
                                    </th>
                                    <th className="text-right p-2 font-medium">
                                      Margin
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rows.map((p, i) => (
                                    <tr
                                      key={`product-perf-${(page - 1) * PAGE_SIZE + i}`}
                                      className="border-b border-border/50"
                                    >
                                      <td className="p-2 font-medium">
                                        {p.productName}
                                      </td>
                                      <td className="text-right p-2 text-muted-foreground tabular-nums">
                                        {p.quantity}
                                      </td>
                                      <td className="text-right p-2 text-muted-foreground tabular-nums">
                                        {fN(p.revenue)}
                                      </td>
                                      <td
                                        className={`text-right p-2 tabular-nums ${p.margin >= 0 ? "text-green-600" : "text-destructive"}`}
                                      >
                                        {fN(p.margin)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {totalPages > 1 && (
                                <Pagination className="mt-4">
                                  <PaginationContent>
                                    <PaginationItem>
                                      <PaginationPrevious
                                        onClick={() =>
                                          setProductPerfPage((p) =>
                                            Math.max(1, p - 1),
                                          )
                                        }
                                        className={
                                          page <= 1
                                            ? "pointer-events-none opacity-50"
                                            : "cursor-pointer"
                                        }
                                      />
                                    </PaginationItem>
                                    <PaginationItem>
                                      <span className="px-2 text-sm text-muted-foreground">
                                        Page {page} of {totalPages}
                                      </span>
                                    </PaginationItem>
                                    <PaginationItem>
                                      <PaginationNext
                                        onClick={() =>
                                          setProductPerfPage((p) =>
                                            Math.min(totalPages, p + 1),
                                          )
                                        }
                                        className={
                                          page >= totalPages
                                            ? "pointer-events-none opacity-50"
                                            : "cursor-pointer"
                                        }
                                      />
                                    </PaginationItem>
                                  </PaginationContent>
                                </Pagination>
                              )}
                            </>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}
              </>
            )}
          </TabsContent>

          <TabsContent value="promos" className="space-y-6 mt-6">
            {data && (
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle>Promotion Effectiveness</CardTitle>
                  <CardDescription>
                    Active promo codes and their usage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.promoEffectiveness.promos.length === 0 ? (
                    <p className="text-center py-10 text-muted-foreground text-sm">
                      No active promo codes.
                    </p>
                  ) : (
                    <>
                      <div className="text-center mb-4 p-4 rounded-lg border bg-muted/50">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                          Total Usage
                        </p>
                        <p className="text-3xl font-bold text-primary">
                          {data.promoEffectiveness.totalUsageCount}
                        </p>
                      </div>
                      {(() => {
                        const list = [...data.promoEffectiveness.promos].sort(
                          (a, b) => b.usageCount - a.usageCount,
                        );
                        const totalPages = Math.max(
                          1,
                          Math.ceil(list.length / PAGE_SIZE),
                        );
                        const page = Math.min(promosPage, totalPages);
                        const rows = list.slice(
                          (page - 1) * PAGE_SIZE,
                          page * PAGE_SIZE,
                        );
                        return (
                          <>
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse text-sm">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left p-2 font-medium">
                                      Promo Code
                                    </th>
                                    <th className="text-right p-2 font-medium">
                                      Usage Count
                                    </th>
                                    <th className="text-right p-2 font-medium">
                                      Value
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rows.map((p) => (
                                    <tr
                                      key={p.code}
                                      className="border-b border-border/50"
                                    >
                                      <td className="p-2 font-semibold text-primary">
                                        {p.code}
                                      </td>
                                      <td className="text-right p-2 text-muted-foreground tabular-nums">
                                        {p.usageCount}
                                      </td>
                                      <td className="text-right p-2 text-muted-foreground tabular-nums">
                                        {fN(p.value)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {totalPages > 1 && (
                              <Pagination className="mt-4">
                                <PaginationContent>
                                  <PaginationItem>
                                    <PaginationPrevious
                                      onClick={() =>
                                        setPromosPage((p) => Math.max(1, p - 1))
                                      }
                                      className={
                                        page <= 1
                                          ? "pointer-events-none opacity-50"
                                          : "cursor-pointer"
                                      }
                                    />
                                  </PaginationItem>
                                  <PaginationItem>
                                    <span className="px-2 text-sm text-muted-foreground">
                                      Page {page} of {totalPages}
                                    </span>
                                  </PaginationItem>
                                  <PaginationItem>
                                    <PaginationNext
                                      onClick={() =>
                                        setPromosPage((p) =>
                                          Math.min(totalPages, p + 1),
                                        )
                                      }
                                      className={
                                        page >= totalPages
                                          ? "pointer-events-none opacity-50"
                                          : "cursor-pointer"
                                      }
                                    />
                                  </PaginationItem>
                                </PaginationContent>
                              </Pagination>
                            )}
                          </>
                        );
                      })()}
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
