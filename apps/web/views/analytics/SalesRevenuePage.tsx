"use client";

/**
 * Sales & Revenue Analytics: KPIs, time series, composition, credit, user performance.
 * Uses shared URL-based filters via useAnalyticsFilters; backend enforces role (user sees own only).
 * Drill-down: click View sales on composition/user opens table; row click opens SaleDetail.
 */

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAnalyticsFilters } from "@/hooks/useAnalyticsFilters";
import {
  useSalesRevenueAnalytics,
  useDiscountAnalytics,
  usePaymentTrendsAnalytics,
  useLocationComparisonAnalytics,
} from "@/hooks/useAnalytics";
import { useAuthStore, selectUserRole } from "@/stores/auth-store";
import { useSalesPaginated, useSale } from "@/hooks/useSales";
import { AnalyticsFilterBar } from "./components/AnalyticsFilterBar";
import {
  ReportsLineChart,
  ReportsDoughnutChart,
  ReportsBarChart,
  ReportsAgingBar,
  getReportChartColor,
} from "@/components/reports-charts";
import { SalesTable } from "@/views/sales/components/SalesTable";
import { SaleDetail } from "@/views/sales/components/SaleDetail";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  Receipt,
  TrendingUp,
  Percent,
  CreditCard,
  Users,
  List,
  Search,
  MapPin,
  Wallet,
} from "lucide-react";
import type { Sale } from "@/hooks/useSales";

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
  const { data: discountData, isLoading: discountLoading } =
    useDiscountAnalytics(apiParams);
  const { data: paymentTrendsData, isLoading: paymentTrendsLoading } =
    usePaymentTrendsAnalytics(apiParams);
  const { data: locationComparisonData, isLoading: locationComparisonLoading } =
    useLocationComparisonAnalytics(apiParams);
  const [drillDown, setDrillDown] = useState<DrillDown | null>(null);
  const [drillPage, setDrillPage] = useState(1);
  const [drillPageSize] = useState(10);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [userPerformanceSearch, setUserPerformanceSearch] = useState("");
  const [revenueTimeScale, setRevenueTimeScale] = useState<"linear" | "log">(
    "linear",
  );
  const [creditTimeScale, setCreditTimeScale] = useState<"linear" | "log">(
    "linear",
  );
  const [creditAgingScale, setCreditAgingScale] = useState<"linear" | "log">(
    "linear",
  );
  const [userPerfScale, setUserPerfScale] = useState<"linear" | "log">(
    "linear",
  );
  const [primaryKpiMetric, setPrimaryKpiMetric] = useState<
    "totalRevenue" | "netRevenue" | "salesCount" | "avgOrderValue"
  >("totalRevenue");
  const [discountTimeScale, setDiscountTimeScale] = useState<"linear" | "log">(
    "linear",
  );
  const [paymentTrendsScale, setPaymentTrendsScale] = useState<
    "linear" | "log"
  >("linear");
  const [locationSearch, setLocationSearch] = useState("");

  // Payment method series from payment trends: keys except "date"
  const paymentMethodSeries = useMemo(() => {
    const ts = paymentTrendsData?.timeSeries ?? [];
    if (ts.length === 0) return [];
    const keys = new Set<string>();
    ts.forEach((row) => {
      Object.keys(row).forEach((k) => {
        if (k !== "date") keys.add(k);
      });
    });
    return Array.from(keys)
      .sort()
      .map((method, i) => ({
        dataKey: method,
        label: method,
        color: getReportChartColor(i),
      }));
  }, [paymentTrendsData?.timeSeries]);

  const filteredLocationComparison = useMemo(() => {
    const list = locationComparisonData ?? [];
    if (!locationSearch.trim()) return list;
    const q = locationSearch.trim().toLowerCase();
    return list.filter((l) => (l.locationName ?? "").toLowerCase().includes(q));
  }, [locationComparisonData, locationSearch]);

  const filteredUserPerformance = useMemo(() => {
    const list = data?.userPerformance ?? [];
    if (isUserRole || !userPerformanceSearch.trim()) return list;
    const q = userPerformanceSearch.trim().toLowerCase();
    return list.filter((u) => (u.username ?? "").toLowerCase().includes(q));
  }, [data?.userPerformance, userPerformanceSearch, isUserRole]);

  const startDateParam =
    typeof apiParams.dateFrom === "string"
      ? apiParams.dateFrom
      : Array.isArray(apiParams.dateFrom)
        ? apiParams.dateFrom[0]
        : undefined;
  const endDateParam =
    typeof apiParams.dateTo === "string"
      ? apiParams.dateTo
      : Array.isArray(apiParams.dateTo)
        ? apiParams.dateTo[0]
        : undefined;
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
  const drillPagination = drillResponse?.pagination
    ? {
        currentPage: drillResponse.pagination.currentPage,
        totalPages: drillResponse.pagination.totalPages,
        totalItems: drillResponse.pagination.totalItems,
        itemsPerPage: drillResponse.pagination.itemsPerPage,
        hasNextPage: drillResponse.pagination.hasNextPage,
        hasPrevPage: drillResponse.pagination.hasPrevPage,
      }
    : null;

  const { data: selectedSale, isLoading: saleLoading } = useSale(
    selectedSaleId || "",
  );

  const onViewSale = useCallback((sale: Sale) => {
    setSelectedSaleId(sale.id);
  }, []);

  const openDrill = useCallback((d: DrillDown) => {
    setDrillDown(d);
    setDrillPage(1);
    setSelectedSaleId(null);
  }, []);

  const closeDrill = useCallback(() => {
    setDrillDown(null);
    setSelectedSaleId(null);
  }, []);

  const kpiItems = data
    ? [
        {
          label: "Total revenue",
          value: formatCurrency(data.kpis.totalRevenue),
          sublabel: "Gross (before discount)",
          icon: DollarSign,
        },
        {
          label: "Net revenue",
          value: formatCurrency(data.kpis.netRevenue),
          sublabel: `${data.kpis.salesCount} sales`,
          icon: Receipt,
        },
        {
          label: "Sales count",
          value: String(data.kpis.salesCount),
          sublabel: "Orders",
          icon: Receipt,
        },
        {
          label: "Avg order value",
          value: formatCurrency(data.kpis.avgOrderValue),
          sublabel: "Per sale",
          icon: TrendingUp,
        },
        {
          label: "Total discount",
          value: `-${formatCurrency(data.kpis.totalDiscount)}`,
          sublabel: "Given",
          icon: Percent,
        },
        {
          label: "Outstanding credit",
          value: formatCurrency(data.kpis.outstandingCredit),
          sublabel: "Unpaid balance",
          icon: CreditCard,
          href: `${basePath}/sales?credit=credit`,
        },
      ]
    : [];

  const primaryKpiValue = data
    ? primaryKpiMetric === "totalRevenue"
      ? formatCurrency(data.kpis.totalRevenue)
      : primaryKpiMetric === "netRevenue"
        ? formatCurrency(data.kpis.netRevenue)
        : primaryKpiMetric === "salesCount"
          ? String(data.kpis.salesCount)
          : formatCurrency(data.kpis.avgOrderValue)
    : null;
  const primaryKpiSublabel =
    primaryKpiMetric === "totalRevenue"
      ? "Gross (before discount)"
      : primaryKpiMetric === "netRevenue"
        ? `${data?.kpis.salesCount ?? 0} sales`
        : primaryKpiMetric === "salesCount"
          ? "Orders"
          : "Per sale";

  return (
    <div
      className="reports-container min-w-0 w-full max-w-full space-y-6 overflow-x-auto"
      data-reports
    >
      <header className="min-w-0">
        <h1 className="text-2xl font-bold text-balance md:text-3xl">
          Sales & Revenue Analytics
        </h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Revenue, cash flow, and sales performance
        </p>
        {isUserRole && (
          <p className="text-muted-foreground mt-1 text-xs" role="status">
            Showing your performance
          </p>
        )}
      </header>

      <div className="min-w-0">
        <AnalyticsFilterBar />
      </div>

      <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="min-w-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Key metric</CardTitle>
            <Select
              value={primaryKpiMetric}
              onValueChange={(v) =>
                setPrimaryKpiMetric(
                  v as
                    | "totalRevenue"
                    | "netRevenue"
                    | "salesCount"
                    | "avgOrderValue",
                )
              }
            >
              <SelectTrigger className="h-7 w-[120px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="totalRevenue">Total revenue</SelectItem>
                <SelectItem value="netRevenue">Net revenue</SelectItem>
                <SelectItem value="salesCount">Sales count</SelectItem>
                <SelectItem value="avgOrderValue">Avg order value</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {primaryKpiValue ?? "-"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {primaryKpiSublabel}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        {kpiItems.map((item, i) => {
          const card = (
            <Card className="min-w-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {item.label}
                </CardTitle>
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
          );
          return "href" in item && item.href ? (
            <Link
              key={i}
              href={item.href}
              className="block focus:outline-none focus:ring-2 focus:ring-ring rounded-lg"
            >
              {card}
            </Link>
          ) : (
            <div key={i}>{card}</div>
          );
        })}
      </div>

      <Card className="min-w-0 shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
          <div>
            <CardTitle>Revenue over time</CardTitle>
            <CardDescription>
              Gross revenue, net revenue, and discount by day
            </CardDescription>
          </div>
          <Select
            value={revenueTimeScale}
            onValueChange={(v) => setRevenueTimeScale(v as "linear" | "log")}
          >
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue placeholder="Scale" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="linear">Linear</SelectItem>
              <SelectItem value="log">Log</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="min-w-0 overflow-hidden">
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : data?.timeSeries?.length ? (
            <ReportsLineChart
              data={
                data.timeSeries as unknown as Array<Record<string, unknown>>
              }
              series={[
                {
                  dataKey: "gross",
                  label: "Gross revenue",
                  color: getReportChartColor(0),
                },
                {
                  dataKey: "net",
                  label: "Net revenue",
                  color: getReportChartColor(1),
                },
                {
                  dataKey: "discount",
                  label: "Discount",
                  color: getReportChartColor(2),
                },
              ]}
              xLabel="Date"
              yLabel="Amount"
              ariaLabel="Revenue over time: gross, net, discount by day"
              scale={revenueTimeScale}
              formatValue={formatCurrency}
              height={300}
            />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No time series data
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Sales composition</CardTitle>
          <CardDescription>
            By location, payment method, or sale type
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 overflow-hidden">
          {isLoading ? (
            <Skeleton className="h-[320px] w-full" />
          ) : (
            <Tabs defaultValue="location" className="min-w-0 w-full">
              <TabsList className="w-full max-w-full overflow-x-auto flex-nowrap justify-start">
                <TabsTrigger value="location" className="shrink-0">
                  By location
                </TabsTrigger>
                <TabsTrigger value="payment" className="shrink-0">
                  By payment method
                </TabsTrigger>
                <TabsTrigger value="type" className="shrink-0">
                  By sale type
                </TabsTrigger>
              </TabsList>
              <TabsContent value="location">
                <ReportsDoughnutChart
                  data={
                    data?.composition.byLocation.map((c) => ({
                      name: c.locationName,
                      value: c.revenue,
                      id: c.locationId,
                    })) ?? []
                  }
                  title="Revenue by location"
                  formatValue={formatCurrency}
                />
                {data?.composition.byLocation.length ? (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {data.composition.byLocation.map((c) => (
                      <Button
                        key={c.locationId}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() =>
                          openDrill({
                            type: "location",
                            id: c.locationId,
                            label: c.locationName,
                          })
                        }
                      >
                        <List className="h-3 w-3 mr-1" />
                        View sales: {c.locationName}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </TabsContent>
              <TabsContent value="payment">
                <ReportsDoughnutChart
                  data={
                    data?.composition.byPaymentMethod.map((c) => ({
                      name: c.method,
                      value: c.revenue,
                      id: c.method,
                    })) ?? []
                  }
                  title="Revenue by payment method"
                  formatValue={formatCurrency}
                />
              </TabsContent>
              <TabsContent value="type">
                <ReportsDoughnutChart
                  data={
                    data?.composition.bySaleType.map((c) => ({
                      name: c.type,
                      value: c.revenue,
                      id: c.type,
                    })) ?? []
                  }
                  title="Revenue by sale type"
                  formatValue={formatCurrency}
                />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Discount analytics: over time, by user, by location */}
      <Card className="min-w-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 shrink-0" />
            Discount analytics
          </CardTitle>
          <CardDescription>
            Discount over time and by user or location
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 overflow-hidden">
          {discountLoading ? (
            <Skeleton className="h-[320px] w-full" />
          ) : (
            <Tabs defaultValue="overTime" className="min-w-0 w-full">
              <TabsList className="w-full max-w-full overflow-x-auto flex-nowrap justify-start">
                <TabsTrigger value="overTime" className="shrink-0">
                  Over time
                </TabsTrigger>
                <TabsTrigger value="byUser" className="shrink-0">
                  By user
                </TabsTrigger>
                <TabsTrigger value="byLocation" className="shrink-0">
                  By location
                </TabsTrigger>
              </TabsList>
              <TabsContent value="overTime">
                <div className="flex flex-row flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-xs text-muted-foreground">Amount</span>
                  <Select
                    value={discountTimeScale}
                    onValueChange={(v) =>
                      setDiscountTimeScale(v as "linear" | "log")
                    }
                  >
                    <SelectTrigger className="w-[100px] h-8 text-xs">
                      <SelectValue placeholder="Scale" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linear">Linear</SelectItem>
                      <SelectItem value="log">Log</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {discountData?.discountOverTime?.length ? (
                  <ReportsLineChart
                    data={
                      discountData.discountOverTime as unknown as Array<
                        Record<string, unknown>
                      >
                    }
                    series={[
                      {
                        dataKey: "discount",
                        label: "Discount",
                        color: getReportChartColor(2),
                      },
                    ]}
                    xLabel="Date"
                    yLabel="Discount"
                    ariaLabel="Discount over time"
                    scale={discountTimeScale}
                    formatValue={formatCurrency}
                    height={300}
                  />
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No discount over time data
                  </div>
                )}
              </TabsContent>
              <TabsContent value="byUser">
                {discountData?.byUser?.length ? (
                  <ReportsBarChart
                    data={discountData.byUser.map((u) => ({
                      userId: u.userId,
                      username: u.username,
                      value: u.discount,
                    }))}
                    valueLabel="Discount"
                    xLabel="User"
                    yLabel="Discount"
                    formatValue={formatCurrency}
                    height={300}
                  />
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No discount by user data
                  </div>
                )}
              </TabsContent>
              <TabsContent value="byLocation">
                {discountData?.byLocation?.length ? (
                  <ReportsDoughnutChart
                    data={discountData.byLocation.map((l) => ({
                      name: l.locationName,
                      value: l.discount,
                      id: l.locationId,
                    }))}
                    title="Discount by location"
                    ariaLabel="Discount by location"
                    formatValue={formatCurrency}
                  />
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No discount by location data
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Payment method over time */}
      <Card className="min-w-0 shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 shrink-0" />
              Payment method over time
            </CardTitle>
            <CardDescription>Daily totals by payment method</CardDescription>
          </div>
          <Select
            value={paymentTrendsScale}
            onValueChange={(v) => setPaymentTrendsScale(v as "linear" | "log")}
          >
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue placeholder="Scale" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="linear">Linear</SelectItem>
              <SelectItem value="log">Log</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="min-w-0 overflow-hidden">
          {paymentTrendsLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : paymentTrendsData?.timeSeries?.length &&
            paymentMethodSeries.length > 0 ? (
            <ReportsLineChart
              data={
                paymentTrendsData.timeSeries as unknown as Array<
                  Record<string, unknown>
                >
              }
              series={paymentMethodSeries}
              xLabel="Date"
              yLabel="Amount"
              ariaLabel="Payment method over time"
              scale={paymentTrendsScale}
              formatValue={formatCurrency}
              height={300}
            />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No payment trends data
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location comparison */}
      <Card className="min-w-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 shrink-0" />
            Location comparison
          </CardTitle>
          <CardDescription>
            Revenue, sales count, and discount per location
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 overflow-x-auto">
          {locationComparisonLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : filteredLocationComparison.length > 0 ? (
            <>
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by location name..."
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  className="pl-8 h-9 text-sm max-w-xs"
                  aria-label="Search location comparison"
                />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLocationComparison.map((l) => (
                    <TableRow key={l.locationId}>
                      <TableCell className="font-medium">
                        {l.locationName}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(l.revenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {l.salesCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(l.discount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              No location data
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <Card className="min-w-0 shadow-sm">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
            <div>
              <CardTitle>Credit issued vs paid</CardTitle>
              <CardDescription>Over time</CardDescription>
            </div>
            <Select
              value={creditTimeScale}
              onValueChange={(v) => setCreditTimeScale(v as "linear" | "log")}
            >
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue placeholder="Scale" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linear">Linear</SelectItem>
                <SelectItem value="log">Log</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="min-w-0 overflow-hidden">
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : data?.credit.timeSeries?.length ? (
              <ReportsLineChart
                data={
                  data.credit.timeSeries as unknown as Array<
                    Record<string, unknown>
                  >
                }
                series={[
                  {
                    dataKey: "issued",
                    label: "Credit issued",
                    color: getReportChartColor(0),
                  },
                  {
                    dataKey: "paid",
                    label: "Credit paid",
                    color: getReportChartColor(1),
                  },
                ]}
                xLabel="Date"
                yLabel="Amount"
                ariaLabel="Credit issued vs paid over time"
                scale={creditTimeScale}
                formatValue={formatCurrency}
                height={280}
              />
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No credit data
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 shadow-sm">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
            <div>
              <CardTitle>Credit aging</CardTitle>
              <CardDescription>Outstanding by days overdue</CardDescription>
            </div>
            <Select
              value={creditAgingScale}
              onValueChange={(v) => setCreditAgingScale(v as "linear" | "log")}
            >
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue placeholder="Scale" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linear">Linear</SelectItem>
                <SelectItem value="log">Log</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="min-w-0 overflow-hidden">
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ReportsAgingBar
                scale={creditAgingScale}
                data={[
                  { bucket: "0-7 days", value: data?.credit.aging["0-7"] ?? 0 },
                  {
                    bucket: "8-30 days",
                    value: data?.credit.aging["8-30"] ?? 0,
                  },
                  { bucket: "30+ days", value: data?.credit.aging["30+"] ?? 0 },
                ]}
                formatValue={formatCurrency}
                xLabel="Amount"
                yLabel="Bucket"
                height={180}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0 shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 shrink-0" />
              {isUserRole ? "Your performance" : "User performance"}
            </CardTitle>
            <CardDescription>
              {isUserRole
                ? "Your revenue, sales count, and avg discount"
                : "Revenue, sales count, and avg discount per user"}
            </CardDescription>
          </div>
          <Select
            value={userPerfScale}
            onValueChange={(v) => setUserPerfScale(v as "linear" | "log")}
          >
            <SelectTrigger className="w-[100px] h-8 text-xs shrink-0">
              <SelectValue placeholder="Scale" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="linear">Linear</SelectItem>
              <SelectItem value="log">Log</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="min-w-0 overflow-hidden">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : data?.userPerformance?.length ? (
            <>
              {!isUserRole && (
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by username..."
                    value={userPerformanceSearch}
                    onChange={(e) => setUserPerformanceSearch(e.target.value)}
                    className="pl-8 h-9 text-sm max-w-xs"
                    aria-label="Search user performance"
                  />
                </div>
              )}
              <Tabs defaultValue="revenue" className="min-w-0 w-full">
                <TabsList className="w-full max-w-full overflow-x-auto flex-nowrap justify-start">
                  <TabsTrigger value="revenue" className="shrink-0">
                    Revenue
                  </TabsTrigger>
                  <TabsTrigger value="count" className="shrink-0">
                    Sales count
                  </TabsTrigger>
                  <TabsTrigger value="discount" className="shrink-0">
                    Avg discount
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="revenue">
                  <ReportsBarChart
                    data={filteredUserPerformance.map((u) => ({
                      userId: u.userId,
                      username: u.username,
                      value: u.revenue,
                    }))}
                    valueLabel="Revenue"
                    xLabel={isUserRole ? "You" : "User"}
                    yLabel="Revenue"
                    scale={userPerfScale}
                    formatValue={formatCurrency}
                    height={280}
                  />
                  {filteredUserPerformance.length ? (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {filteredUserPerformance.map((u) => (
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
                          <List className="h-3 w-3 mr-1" />
                          View sales: {u.username}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </TabsContent>
                <TabsContent value="count">
                  <ReportsBarChart
                    data={filteredUserPerformance.map((u) => ({
                      userId: u.userId,
                      username: u.username,
                      value: u.salesCount,
                    }))}
                    valueLabel="Sales count"
                    formatValue={(n) => String(Math.round(n))}
                    xLabel={isUserRole ? "You" : "User"}
                    yLabel="Sales count"
                    scale={userPerfScale}
                    height={280}
                  />
                </TabsContent>
                <TabsContent value="discount">
                  <ReportsBarChart
                    data={filteredUserPerformance.map((u) => ({
                      userId: u.userId,
                      username: u.username,
                      value: u.avgDiscount,
                    }))}
                    valueLabel="Avg discount"
                    xLabel={isUserRole ? "You" : "User"}
                    yLabel="Avg discount"
                    scale={userPerfScale}
                    formatValue={formatCurrency}
                    height={280}
                  />
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No user performance data
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!drillDown} onOpenChange={(open) => !open && closeDrill()}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
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
                const salesPageHref = q.toString()
                  ? `${basePath}/sales?${q.toString()}`
                  : `${basePath}/sales`;
                return (
                  <p className="text-sm text-muted-foreground">
                    <Link
                      href={salesPageHref}
                      className="font-medium text-primary hover:underline"
                    >
                      Open in Sales page
                    </Link>
                    {" with same filters"}
                  </p>
                );
              })()}
              {drillLoading ? (
                <Skeleton className="h-48 w-full" />
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
