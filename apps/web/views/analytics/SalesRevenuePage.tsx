"use client";

/**
 * Sales & Revenue Analytics: KPIs, time series, composition, credit, user performance.
 * Uses shared URL-based filters via useAnalyticsFilters; backend enforces role (user sees own only).
 * Drill-down: click View sales on composition/user opens table; row click opens SaleDetail.
 */

import { useState, useCallback } from "react";
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
import { useSalesRevenueAnalytics } from "@/hooks/useAnalytics";
import { useSalesPaginated, useSale } from "@/hooks/useSales";
import { AnalyticsFilterBar } from "./components/AnalyticsFilterBar";
import {
  KpiCards,
  TimeSeriesLineChart,
  DonutChart,
  CreditTimeSeriesChart,
  AgingBucketsBar,
  BarChartByUser,
} from "@/components/charts";
import { SalesTable } from "@/views/sales/components/SalesTable";
import { SaleDetail } from "@/views/sales/components/SaleDetail";
import { DataTablePagination, type PaginationState } from "@/components/ui/data-table-pagination";
import { formatCurrency } from "@/lib/format";
import {
  DollarSign,
  Receipt,
  TrendingUp,
  Percent,
  CreditCard,
  Users,
  List,
} from "lucide-react";
import type { Sale } from "@/hooks/useSales";

type DrillDown = { type: "location"; id: string; label: string } | { type: "user"; id: string; label: string };

export function SalesRevenuePage() {
  const { apiParams, filters } = useAnalyticsFilters();
  const { data, isLoading } = useSalesRevenueAnalytics(apiParams);
  const [drillDown, setDrillDown] = useState<DrillDown | null>(null);
  const [drillPage, setDrillPage] = useState(1);
  const [drillPageSize] = useState(10);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

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
        },
      ]
    : [];

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-3xl font-bold text-balance">
          Sales & Revenue Analytics
        </h1>
        <p className="text-muted-foreground mt-2">
          Revenue, cash flow, and sales performance
        </p>
      </div>

      <AnalyticsFilterBar />

      <KpiCards items={kpiItems} isLoading={isLoading} />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Revenue over time</CardTitle>
          <CardDescription>
            Gross revenue, net revenue, and discount by day
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : data?.timeSeries?.length ? (
            <TimeSeriesLineChart
              data={data.timeSeries as unknown as Array<Record<string, unknown>>}
              series={[
                {
                  dataKey: "gross",
                  label: "Gross revenue",
                  color: "hsl(var(--chart-1))",
                },
                {
                  dataKey: "net",
                  label: "Net revenue",
                  color: "hsl(var(--chart-2))",
                },
                {
                  dataKey: "discount",
                  label: "Discount",
                  color: "hsl(var(--chart-3))",
                },
              ]}
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
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[320px] w-full" />
          ) : (
            <Tabs defaultValue="location" className="w-full">
              <TabsList>
                <TabsTrigger value="location">By location</TabsTrigger>
                <TabsTrigger value="payment">By payment method</TabsTrigger>
                <TabsTrigger value="type">By sale type</TabsTrigger>
              </TabsList>
              <TabsContent value="location">
                <DonutChart
                  data={
                    data?.composition.byLocation.map((c) => ({
                      name: c.locationName,
                      value: c.revenue,
                      id: c.locationId,
                    })) ?? []
                  }
                  title="Revenue by location"
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
                <DonutChart
                  data={
                    data?.composition.byPaymentMethod.map((c, i) => ({
                      name: c.method,
                      value: c.revenue,
                      id: c.method,
                    })) ?? []
                  }
                  title="Revenue by payment method"
                />
              </TabsContent>
              <TabsContent value="type">
                <DonutChart
                  data={
                    data?.composition.bySaleType.map((c) => ({
                      name: c.type,
                      value: c.revenue,
                      id: c.type,
                    })) ?? []
                  }
                  title="Revenue by sale type"
                />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Credit issued vs paid</CardTitle>
            <CardDescription>Over time</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : data?.credit.timeSeries?.length ? (
              <CreditTimeSeriesChart data={data.credit.timeSeries} />
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No credit data
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Credit aging</CardTitle>
            <CardDescription>Outstanding by days overdue</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <AgingBucketsBar
                data={[
                  { bucket: "0-7 days", value: data?.credit.aging["0-7"] ?? 0 },
                  { bucket: "8-30 days", value: data?.credit.aging["8-30"] ?? 0 },
                  { bucket: "30+ days", value: data?.credit.aging["30+"] ?? 0 },
                ]}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User performance
          </CardTitle>
          <CardDescription>
            Revenue, sales count, and avg discount per user
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : data?.userPerformance?.length ? (
            <Tabs defaultValue="revenue" className="w-full">
              <TabsList>
                <TabsTrigger value="revenue">Revenue</TabsTrigger>
                <TabsTrigger value="count">Sales count</TabsTrigger>
                <TabsTrigger value="discount">Avg discount</TabsTrigger>
              </TabsList>
              <TabsContent value="revenue">
                <BarChartByUser
                  data={data.userPerformance.map((u) => ({
                    userId: u.userId,
                    username: u.username,
                    value: u.revenue,
                  }))}
                  valueLabel="Revenue"
                />
                {data.userPerformance.length ? (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {data.userPerformance.map((u) => (
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
                <BarChartByUser
                  data={data.userPerformance.map((u) => ({
                    userId: u.userId,
                    username: u.username,
                    value: u.salesCount,
                  }))}
                  valueLabel="Sales count"
                  formatValue={(n) => String(Math.round(n))}
                />
              </TabsContent>
              <TabsContent value="discount">
                <BarChartByUser
                  data={data.userPerformance.map((u) => ({
                    userId: u.userId,
                    username: u.username,
                    value: u.avgDiscount,
                  }))}
                  valueLabel="Avg discount"
                />
              </TabsContent>
            </Tabs>
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
