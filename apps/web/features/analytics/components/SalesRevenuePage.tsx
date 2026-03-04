"use client";

/**
 * Sales & Revenue Analytics — Recharts with palette C. Growth, basket size, peak hours, gross profit/margin.
 * Drill-down, SalesTable/SaleDetail, and export preserved.
 */

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsFilters } from "@/features/analytics";
import {
  useSalesRevenueAnalytics,
  useDiscountAnalytics,
  usePaymentTrendsAnalytics,
  useLocationComparisonAnalytics,
  useSalesExtendedAnalytics,
} from "@/features/analytics";
import { useAuthStore, selectUserRole } from "@/store/auth-store";
import { useSalesPaginated, useSale } from "@/features/sales";
import { AnalyticsFilterBar } from "./components/AnalyticsFilterBar";
import { SalesTable, SaleDetail } from "@/features/sales";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { exportAnalytics } from "@/features/analytics";
import { downloadBlobFromResponse } from "@/lib/downloadBlob";
import {
  C,
  getChartColor,
  fN,
  fS,
  fP,
  axisTick,
  gridProps,
  colorToDataKey,
  snapWidthPercent,
  tooltipStyle,
} from "./reportTheme";
import { AnalyticsChartTooltip } from "./AnalyticsChartTooltip";
import type { Sale } from "@/features/sales";

function ProgressBar({
  v,
  mx,
  color = C.accent,
}: {
  v: number;
  mx: number;
  color?: string;
}) {
  const width = snapWidthPercent(v, mx);
  const dataColor = colorToDataKey(color) || "primary";
  return (
    <div className="analytics-progress-track">
      <div
        className="analytics-progress-fill"
        data-width={width}
        data-color={dataColor}
      />
    </div>
  );
}

type DrillDown =
  | { type: "location"; id: string; label: string }
  | { type: "user"; id: string; label: string };

export function SalesRevenuePage() {
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const userRole = useAuthStore(selectUserRole);
  const isUserRole = userRole === "user";
  const { apiParams, filters } = useAnalyticsFilters();
  const { data, isLoading } = useSalesRevenueAnalytics(apiParams);
  const { data: extData, isLoading: extLoading } =
    useSalesExtendedAnalytics(apiParams);
  const { data: discountData } = useDiscountAnalytics(apiParams);
  const { data: paymentTrendsData } = usePaymentTrendsAnalytics(apiParams);
  const { data: locationData } = useLocationComparisonAnalytics(apiParams);
  const [view, setView] = useState<
    "overview" | "locations" | "credit" | "users"
  >("overview");
  const [drillDown, setDrillDown] = useState<DrillDown | null>(null);
  const [drillPage, setDrillPage] = useState(1);
  const [drillPageSize] = useState(10);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const LOCATION_PAGE_SIZE = 10;
  const [locationPage, setLocationPage] = useState(1);

  // Drill-down params
  const startDateParam =
    typeof apiParams.dateFrom === "string" ? apiParams.dateFrom : undefined;
  const endDateParam =
    typeof apiParams.dateTo === "string" ? apiParams.dateTo : undefined;
  const drillParams = {
    page: drillPage,
    limit: drillPageSize,
    startDate: startDateParam,
    endDate: endDateParam,
    locationId: drillDown?.type === "location" ? drillDown.id : undefined,
    createdById: drillDown?.type === "user" ? drillDown.id : undefined,
    type: filters.saleType,
    isCreditSale:
      filters.creditStatus === "credit"
        ? true
        : filters.creditStatus === "non-credit"
          ? false
          : undefined,
    enabled: !!drillDown,
  };
  const { data: drillResponse, isLoading: drillLoading } =
    useSalesPaginated(drillParams);
  const drillSales = drillResponse?.data ?? [];
  const drillPagination = drillResponse?.pagination ?? null;
  const { data: selectedSale, isLoading: saleLoading } = useSale(
    selectedSaleId || "",
  );

  const onViewSale = useCallback(
    (sale: Sale) => setSelectedSaleId(sale.id),
    [],
  );
  const openDrill = useCallback((d: DrillDown) => {
    setDrillDown(d);
    setDrillPage(1);
    setSelectedSaleId(null);
  }, []);
  const closeDrill = useCallback(() => {
    setDrillDown(null);
    setSelectedSaleId(null);
  }, []);

  // Export handler
  const handleExport = useCallback(
    async (format: "csv" | "excel") => {
      setExporting(true);
      try {
        const response = await exportAnalytics(
          "sales-revenue",
          format,
          apiParams,
        );
        downloadBlobFromResponse(
          response,
          `analytics-sales-${new Date().toISOString().slice(0, 10)}.${format === "excel" ? "xlsx" : "csv"}`,
        );
      } catch {
        /* handled by service */
      }
      setExporting(false);
    },
    [apiParams],
  );

  // Composition pie data
  const locPie = useMemo(() => {
    if (!data?.composition.byLocation) return [];
    return data.composition.byLocation.map((l, i) => ({
      name: l.locationName,
      value: l.revenue,
      color: getChartColor(i),
    }));
  }, [data]);

  const paymentPie = useMemo(() => {
    if (!data?.composition.byPaymentMethod) return [];
    return data.composition.byPaymentMethod.map((p, i) => ({
      name: p.method,
      value: p.revenue,
      color: getChartColor(i),
    }));
  }, [data]);

  // Payment trends series
  const paymentMethodSeries = useMemo(() => {
    const ts = paymentTrendsData?.timeSeries ?? [];
    if (!ts.length) return [];
    const keys = new Set<string>();
    ts.forEach((row) =>
      Object.keys(row).forEach((k) => {
        if (k !== "date") keys.add(k);
      }),
    );
    return Array.from(keys)
      .sort()
      .map((method, i) => ({ dataKey: method, color: getChartColor(i) }));
  }, [paymentTrendsData]);

  const loading = isLoading || extLoading;

  // KPIs
  const kpis =
    data && extData
      ? [
          {
            label: "Total Revenue",
            value: fN(data.kpis.totalRevenue),
            sub: `${data.kpis.salesCount} sales`,
            icon: "💰",
          },
          {
            label: "Net Revenue",
            value: fN(data.kpis.netRevenue),
            sub: "After discount",
            icon: "📊",
          },
          {
            label: "Avg Order Value",
            value: fN(data.kpis.avgOrderValue),
            sub: "Per sale",
            icon: "🛒",
          },
          {
            label: "Gross Profit",
            value: fN(extData.grossProfit),
            sub: `${fP(extData.grossMargin)} margin`,
            icon: "📈",
          },
          {
            label: "Basket Size",
            value: `${extData.basketMetrics.avgBasketSize} items`,
            sub: "Per transaction",
            icon: "🧺",
          },
          {
            label: "Outstanding Credit",
            value: fN(data.kpis.outstandingCredit),
            sub: "Unpaid balance",
            icon: "💳",
          },
          {
            label: "Revenue / Member",
            value: fN(extData.revenuePerMember),
            sub: "Member sales avg",
            icon: "👤",
          },
          {
            label: "Discount Ratio",
            value: fP(extData.discountRatio),
            sub: fN(data.kpis.totalDiscount),
            icon: "🏷️",
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
          Sales & Revenue Analytics
        </h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Revenue, cash flow, and sales performance
          {isUserRole && " — showing your data only"}
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <AnalyticsFilterBar />
        </div>
        <div className="flex gap-2">
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
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="credit">Credit</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                  <CardDescription>Monthly aggregates</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={extData?.monthlyAggregates ?? []}>
                      <defs>
                        <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor={C.accent}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor={C.accent}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="month" tick={axisTick} />
                      <YAxis tickFormatter={fS} tick={axisTick} />
                      <Tooltip content={<AnalyticsChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="net"
                        stroke={C.accent}
                        fill="url(#rg)"
                        strokeWidth={2.5}
                        name="Net Revenue"
                        dot={{
                          r: 4,
                          fill: C.accent,
                          stroke: C.bg,
                          strokeWidth: 2,
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle>Growth Rate</CardTitle>
                  <CardDescription>Month-over-month change</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={extData?.growthRates ?? []}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="month" tick={axisTick} />
                      <YAxis tick={axisTick} tickFormatter={(v) => `${v}%`} />
                      <Tooltip
                        formatter={(v: number) => `${v}%`}
                        contentStyle={tooltipStyle}
                      />
                      <Bar
                        dataKey="growthPct"
                        radius={[4, 4, 0, 0]}
                        name="MoM Growth"
                      >
                        {(extData?.growthRates ?? []).map((e, i) => (
                          <Cell
                            key={i}
                            fill={
                              e.growthPct > 0
                                ? C.gongabu
                                : e.growthPct < 0
                                  ? C.red
                                  : C.td
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle>Location Performance</CardTitle>
                  <CardDescription>Revenue by location</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={270}>
                    <BarChart data={locationData ?? []}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="locationName" tick={axisTick} />
                      <YAxis tickFormatter={fS} tick={axisTick} />
                      <Tooltip content={<AnalyticsChartTooltip />} />
                      <Bar
                        dataKey="revenue"
                        radius={[4, 4, 0, 0]}
                        name="Revenue"
                      >
                        {(locationData ?? []).map((_, i) => (
                          <Cell key={i} fill={getChartColor(i)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle>Revenue Share</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={locPie.filter((l) => l.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={82}
                        paddingAngle={3}
                        dataKey="value"
                        animationDuration={800}
                      >
                        {locPie
                          .filter((l) => l.value > 0)
                          .map((d, i) => (
                            <Cell
                              key={i}
                              fill={d.color}
                              stroke={C.bg}
                              strokeWidth={2}
                            />
                          ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => fN(v)}
                        contentStyle={tooltipStyle}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-3 flex-wrap text-xs mt-2">
                    {locPie
                      .filter((l) => l.value > 0)
                      .map((d, i) => {
                        const total = locPie.reduce((s, l) => s + l.value, 0);
                        return (
                          <div key={i} className="flex items-center gap-1.5">
                            <div
                              className="analytics-legend-dot"
                              data-color={colorToDataKey(d.color)}
                            />
                            <span className="text-muted-foreground">
                              {d.name}
                            </span>
                            <span className="font-semibold">
                              {total > 0 ? fP((d.value / total) * 100) : "0%"}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>Revenue Over Time</CardTitle>
                <CardDescription>
                  Gross revenue, net revenue, and discount by day
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data?.timeSeries ?? []}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="date" tick={axisTick} />
                    <YAxis tickFormatter={fS} tick={axisTick} />
                    <Tooltip content={<AnalyticsChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      type="monotone"
                      dataKey="gross"
                      stroke={C.thamel}
                      strokeWidth={2}
                      name="Gross"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="net"
                      stroke={C.gongabu}
                      strokeWidth={2}
                      name="Net"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="discount"
                      stroke={C.red}
                      strokeWidth={1.5}
                      name="Discount"
                      dot={false}
                      strokeDasharray="4 2"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle>Sales by Day of Week</CardTitle>
                  <CardDescription>Revenue distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={extData?.dayOfWeek ?? []}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="day" tick={axisTick} />
                      <YAxis tickFormatter={fS} tick={axisTick} />
                      <Tooltip content={<AnalyticsChartTooltip />} />
                      <Bar
                        dataKey="revenue"
                        radius={[4, 4, 0, 0]}
                        name="Revenue"
                      >
                        {(extData?.dayOfWeek ?? []).map((_, i) => (
                          <Cell key={i} fill={getChartColor(i)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle>Sales by Hour of Day</CardTitle>
                  <CardDescription>Revenue by hour</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={extData?.hourOfDay ?? []}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="hour" tick={axisTick} />
                      <YAxis tickFormatter={fS} tick={axisTick} />
                      <Tooltip content={<AnalyticsChartTooltip />} />
                      <Bar
                        dataKey="revenue"
                        radius={[2, 2, 0, 0]}
                        name="Revenue"
                        fill={C.teal}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle>Payment Method Share</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={paymentPie.filter((p) => p.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={82}
                        paddingAngle={3}
                        dataKey="value"
                        animationDuration={800}
                      >
                        {paymentPie
                          .filter((p) => p.value > 0)
                          .map((d, i) => (
                            <Cell
                              key={i}
                              fill={d.color}
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
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle>Payment Trends</CardTitle>
                  <CardDescription>
                    Daily totals by payment method
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={paymentTrendsData?.timeSeries ?? []}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="date" tick={axisTick} />
                      <YAxis tickFormatter={fS} tick={axisTick} />
                      <Tooltip content={<AnalyticsChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {paymentMethodSeries.map((s) => (
                        <Line
                          key={s.dataKey}
                          type="monotone"
                          dataKey={s.dataKey}
                          stroke={s.color}
                          strokeWidth={1.5}
                          dot={false}
                          name={s.dataKey}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {discountData && (
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle>Discount Analytics</CardTitle>
                  <CardDescription>
                    Discount over time, by user, and by location
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={discountData.discountOverTime}>
                      <defs>
                        <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor={C.red}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor={C.red}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="date" tick={axisTick} />
                      <YAxis tickFormatter={fS} tick={axisTick} />
                      <Tooltip content={<AnalyticsChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="discount"
                        stroke={C.red}
                        fill="url(#dg)"
                        strokeWidth={2}
                        name="Discount"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="locations" className="space-y-6 mt-6">
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>Location Comparison</CardTitle>
                <CardDescription>
                  Revenue, sales count, and discount per location
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const list = locationData ?? [];
                  const totalPages = Math.max(
                    1,
                    Math.ceil(list.length / LOCATION_PAGE_SIZE),
                  );
                  const page = Math.min(locationPage, totalPages);
                  const rows = list.slice(
                    (page - 1) * LOCATION_PAGE_SIZE,
                    page * LOCATION_PAGE_SIZE,
                  );
                  return (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="border-b">
                              {[
                                "Location",
                                "Revenue",
                                "Sales",
                                "Discount",
                                "AOV",
                              ].map((h) => (
                                <th
                                  key={h}
                                  className={
                                    h === "Location"
                                      ? "text-left p-2"
                                      : "text-right p-2 font-medium"
                                  }
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((l, i) => (
                              <tr
                                key={l.locationId}
                                className="border-b border-border/50"
                              >
                                <td className="p-2">
                                  <span className="inline-flex items-center gap-2">
                                    <span
                                      className="analytics-legend-dot"
                                      data-color={colorToDataKey(
                                        getChartColor(
                                          (page - 1) * LOCATION_PAGE_SIZE + i,
                                        ),
                                      )}
                                    />
                                    <Button
                                      variant="link"
                                      className="p-0 h-auto font-medium text-primary underline-offset-2"
                                      onClick={() =>
                                        openDrill({
                                          type: "location",
                                          id: l.locationId,
                                          label: l.locationName,
                                        })
                                      }
                                    >
                                      {l.locationName}
                                    </Button>
                                  </span>
                                </td>
                                <td className="text-right p-2 text-muted-foreground tabular-nums">
                                  {fN(l.revenue)}
                                </td>
                                <td className="text-right p-2 text-muted-foreground tabular-nums">
                                  {l.salesCount}
                                </td>
                                <td className="text-right p-2 text-muted-foreground tabular-nums">
                                  {fN(l.discount)}
                                </td>
                                <td className="text-right p-2 text-muted-foreground tabular-nums">
                                  {l.salesCount > 0
                                    ? fN(l.revenue / l.salesCount)
                                    : "—"}
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
                                  setLocationPage((p) => Math.max(1, p - 1))
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
                                  setLocationPage((p) =>
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

            {discountData && discountData.byLocation.length > 0 && (
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle>Discount by Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={discountData.byLocation}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="locationName" tick={axisTick} />
                      <YAxis tickFormatter={fS} tick={axisTick} />
                      <Tooltip content={<AnalyticsChartTooltip />} />
                      <Bar
                        dataKey="discount"
                        radius={[4, 4, 0, 0]}
                        name="Discount"
                      >
                        {discountData.byLocation.map((_, i) => (
                          <Cell key={i} fill={getChartColor(i)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="credit" className="space-y-6 mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle>Credit Issued vs Paid</CardTitle>
                  <CardDescription>Over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={data?.credit.timeSeries ?? []}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="date" tick={axisTick} />
                      <YAxis tickFormatter={fS} tick={axisTick} />
                      <Tooltip content={<AnalyticsChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line
                        type="monotone"
                        dataKey="issued"
                        stroke={C.online}
                        strokeWidth={2}
                        name="Issued"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="paid"
                        stroke={C.gongabu}
                        strokeWidth={2}
                        name="Paid"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle>Credit Aging</CardTitle>
                  <CardDescription>Outstanding by days overdue</CardDescription>
                </CardHeader>
                <CardContent>
                  {data?.credit.aging && (
                    <div className="flex flex-col gap-3 mt-3">
                      {[
                        {
                          label: "0-7 days",
                          value: data.credit.aging["0-7"],
                          color: C.gongabu,
                        },
                        {
                          label: "8-30 days",
                          value: data.credit.aging["8-30"],
                          color: C.gold,
                        },
                        {
                          label: "30+ days",
                          value: data.credit.aging["30+"],
                          color: C.red,
                        },
                      ].map((b) => {
                        const max = Math.max(
                          data.credit.aging["0-7"],
                          data.credit.aging["8-30"],
                          data.credit.aging["30+"],
                          1,
                        );
                        return (
                          <div key={b.label}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">
                                {b.label}
                              </span>
                              <span
                                className="font-semibold tabular-nums analytics-value"
                                data-color={colorToDataKey(b.color)}
                              >
                                {fN(b.value)}
                              </span>
                            </div>
                            <ProgressBar v={b.value} mx={max} color={b.color} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6 mt-6">
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>User Performance</CardTitle>
                <CardDescription>
                  {isUserRole
                    ? "Your performance"
                    : "Revenue, sales count, and avg discount per user"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data?.userPerformance ?? []}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="username" tick={axisTick} />
                    <YAxis tickFormatter={fS} tick={axisTick} />
                    <Tooltip content={<AnalyticsChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar
                      dataKey="revenue"
                      fill={C.thamel}
                      radius={[4, 4, 0, 0]}
                      name="Revenue"
                    />
                  </BarChart>
                </ResponsiveContainer>
                {(data?.userPerformance ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {(data?.userPerformance ?? []).map((u) => (
                      <Button
                        key={u.userId}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() =>
                          openDrill({
                            type: "user",
                            id: u.userId,
                            label: u.username,
                          })
                        }
                      >
                        View sales: {u.username}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {discountData && discountData.byUser.length > 0 && (
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle>Discount by User</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={discountData.byUser}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="username" tick={axisTick} />
                      <YAxis tickFormatter={fS} tick={axisTick} />
                      <Tooltip content={<AnalyticsChartTooltip />} />
                      <Bar
                        dataKey="discount"
                        radius={[4, 4, 0, 0]}
                        name="Discount"
                        fill={C.rubys}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Drill-down Sheet */}
      <Sheet open={!!drillDown} onOpenChange={(open) => !open && closeDrill()}>
        <SheetContent
          className="w-full sm:max-w-2xl overflow-y-auto"
          aria-describedby={undefined}
        >
          <SheetHeader>
            <SheetTitle>
              Sales {drillDown ? `for ${drillDown.label}` : ""}
            </SheetTitle>
          </SheetHeader>
          {drillDown && (
            <div className="mt-4 space-y-4">
              {(() => {
                const q = new URLSearchParams();
                if (filters.dateFrom) q.set("start", filters.dateFrom);
                if (filters.dateTo) q.set("end", filters.dateTo);
                if (drillDown.type === "user") q.set("userId", drillDown.id);
                if (drillDown.type === "location")
                  q.set("locationId", drillDown.id);
                return (
                  <p className="text-sm text-muted-foreground">
                    <Link
                      href={`${basePath}/sales?${q.toString()}`}
                      className="font-medium text-primary hover:underline"
                    >
                      Open in Sales page
                    </Link>
                  </p>
                );
              })()}
              {drillLoading ? (
                <div className="py-10 text-center text-muted-foreground">
                  Loading...
                </div>
              ) : (
                <>
                  <SalesTable
                    sales={drillSales}
                    isLoading={drillLoading}
                    onView={onViewSale}
                    currentPage={drillPagination?.currentPage ?? 1}
                    itemsPerPage={drillPageSize}
                  />
                  {drillPagination && (
                    <DataTablePagination
                      pagination={drillPagination}
                      onPageChange={setDrillPage}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
      <SaleDetail
        open={!!selectedSaleId}
        onOpenChange={(open) => !open && setSelectedSaleId(null)}
        sale={selectedSale ?? null}
        isLoading={saleLoading}
      />
    </div>
  );
}
