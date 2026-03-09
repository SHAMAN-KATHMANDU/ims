"use client";

/**
 * Inventory & Operations Analytics. KPIs, heatmap, aging, transfer funnel, turnover, DOH, dead stock, sell-through.
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
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  useInventoryOpsAnalytics,
  useInventoryExtendedAnalytics,
} from "@/features/analytics";
import { AnalyticsFilterBar } from "./components/AnalyticsFilterBar";
import { AnalyticsChartTooltip } from "./AnalyticsChartTooltip";
import { ChartInfoButton } from "./components/ChartInfoButton";
import { HeatmapTable } from "@/components/charts";
import { exportAnalytics } from "@/features/analytics";
import { downloadBlobFromResponse } from "@/lib/downloadBlob";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import {
  C,
  getChartColor,
  fN,
  colorToDataKey,
  snapWidthPercent,
  axisTick,
  gridProps,
  tooltipStyle,
  tooltipCursor,
} from "./reportTheme";

function ProgressBar({
  v,
  mx,
  color,
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

export function InventoryOpsPage() {
  const { apiParams } = useAnalyticsFilters();
  const { data, isLoading } = useInventoryOpsAnalytics(apiParams);
  const { data: extData, isLoading: extLoading } =
    useInventoryExtendedAnalytics(apiParams);
  const [view, setView] = useState<"overview" | "doh" | "deadstock">(
    "overview",
  );
  const [exporting, setExporting] = useState(false);
  const PAGE_SIZE = 10;
  const [dohPage, setDohPage] = useState(1);
  const [deadStockPage, setDeadStockPage] = useState(1);

  const handleExport = useCallback(
    async (format: "csv" | "excel") => {
      setExporting(true);
      try {
        const response = await exportAnalytics(
          "inventory-ops",
          format,
          apiParams,
        );
        downloadBlobFromResponse(
          response,
          `analytics-inventory-${new Date().toISOString().slice(0, 10)}.${format === "excel" ? "xlsx" : "csv"}`,
        );
      } catch {
        /* handled */
      }
      setExporting(false);
    },
    [apiParams],
  );

  const loading = isLoading || extLoading;

  const kpis =
    data && extData
      ? [
          {
            label: "Stock Value (Cost)",
            value: fN(data.kpis.totalStockValueCost),
            sub: "At cost price",
          },
          {
            label: "Stock Value (MRP)",
            value: fN(data.kpis.totalStockValueMrp),
            sub: "At MRP",
          },
          {
            label: "Low Stock",
            value: String(data.kpis.lowStockCount),
            sub: "Items ≤ 5 units",
          },
          {
            label: "Out of Stock",
            value: String(data.kpis.outOfStockCount),
            sub: "Items at 0",
          },
          {
            label: "Turnover Ratio",
            value: String(extData.turnoverRatio),
            sub: "COGS / Avg inventory",
          },
          {
            label: "Stock-to-Sales",
            value: String(extData.stockToSalesRatio),
            sub: "Inventory / Sales value",
          },
          {
            label: "Dead Stock Items",
            value: String(extData.deadStock.length),
            sub: "No sales in period",
          },
          {
            label: "Avg Completion",
            value:
              data.avgTransferCompletionDays != null
                ? `${data.avgTransferCompletionDays.toFixed(1)}d`
                : "—",
            sub: "Transfer time",
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
          Inventory & Operations Analytics
        </h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Stock health, turnover, and operational efficiency
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <AnalyticsFilterBar />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={exporting}>
              <Download className="h-4 w-4 mr-2" />
              {exporting ? "..." : "Download"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => handleExport("excel")}
              disabled={exporting}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Download as Excel
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleExport("csv")}
              disabled={exporting}
            >
              <FileText className="h-4 w-4 mr-2" />
              Download as CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="doh">Days on Hand</TabsTrigger>
            <TabsTrigger value="deadstock">Dead Stock</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="min-w-0">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>Inventory Aging</CardTitle>
                    <CardDescription>Stock value by age bucket</CardDescription>
                  </div>
                  <ChartInfoButton content="Total stock value (at MRP) grouped by how long items have been in inventory: 0–30, 31–60, 61–90, and 90+ days. Helps identify slow-moving stock." />
                </CardHeader>
                <CardContent>
                  {data?.aging && (
                    <div className="flex flex-col gap-3">
                      {[
                        {
                          label: "0-30 days",
                          value: data.aging["0-30"],
                          color: C.gongabu,
                        },
                        {
                          label: "31-60 days",
                          value: data.aging["31-60"],
                          color: C.thamel,
                        },
                        {
                          label: "61-90 days",
                          value: data.aging["61-90"],
                          color: C.gold,
                        },
                        {
                          label: "90+ days",
                          value: data.aging["90+"],
                          color: C.red,
                        },
                      ].map((b) => {
                        const max = Math.max(
                          data.aging["0-30"],
                          data.aging["31-60"],
                          data.aging["61-90"],
                          data.aging["90+"],
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
              <Card className="min-w-0">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>Transfer Funnel</CardTitle>
                    <CardDescription>Pending → Completed</CardDescription>
                  </div>
                  <ChartInfoButton content="Number of stock transfers in each stage: Pending, Approved, In Transit, Completed. Shows pipeline of movement between locations." />
                </CardHeader>
                <CardContent>
                  {data?.transferFunnel && (
                    <div className="flex flex-col gap-3">
                      {[
                        {
                          label: "Pending",
                          value: data.transferFunnel.PENDING,
                          color: C.gold,
                        },
                        {
                          label: "Approved",
                          value: data.transferFunnel.APPROVED,
                          color: C.thamel,
                        },
                        {
                          label: "In Transit",
                          value: data.transferFunnel.IN_TRANSIT,
                          color: C.online,
                        },
                        {
                          label: "Completed",
                          value: data.transferFunnel.COMPLETED,
                          color: C.gongabu,
                        },
                      ].map((s) => {
                        const max = Math.max(
                          data.transferFunnel.PENDING,
                          data.transferFunnel.APPROVED,
                          data.transferFunnel.IN_TRANSIT,
                          data.transferFunnel.COMPLETED,
                          1,
                        );
                        return (
                          <div key={s.label}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">
                                {s.label}
                              </span>
                              <span
                                className="font-semibold tabular-nums analytics-value"
                                data-color={colorToDataKey(s.color)}
                              >
                                {s.value}
                              </span>
                            </div>
                            <ProgressBar v={s.value} mx={max} color={s.color} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {extData && extData.sellThroughByLocation.length > 0 && (
              <Card className="min-w-0">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>Sell-Through by Location</CardTitle>
                    <CardDescription>
                      Units sold / (sold + stock) per location
                    </CardDescription>
                  </div>
                  <ChartInfoButton content="Sell-through rate per location: units sold divided by (units sold + current stock). Higher % means inventory is turning faster at that location." />
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={extData.sellThroughByLocation}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="locationName" tick={axisTick} />
                      <YAxis tickFormatter={(v) => `${v}%`} tick={axisTick} />
                      <Tooltip
                        content={(props) => (
                          <AnalyticsChartTooltip
                            {...props}
                            formatter={(v) =>
                              typeof v === "number" ? `${v}%` : String(v ?? "")
                            }
                          />
                        )}
                        wrapperStyle={tooltipStyle}
                        contentStyle={tooltipStyle}
                        cursor={tooltipCursor}
                      />
                      <Bar
                        dataKey="sellThroughRate"
                        radius={[4, 4, 0, 0]}
                        name="Sell-Through %"
                      >
                        {extData.sellThroughByLocation.map((_, i) => (
                          <Cell key={i} fill={getChartColor(i)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {data?.heatmap && data.heatmap.length > 0 && (
              <Card className="min-w-0">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>Stock Heatmap</CardTitle>
                    <CardDescription>
                      Categories × locations (stock value)
                    </CardDescription>
                  </div>
                  <ChartInfoButton content="Stock value (at MRP) by product category and location. Rows are categories, columns are locations. Helps see where each category is held." />
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <HeatmapTable
                    rows={data.heatmap.map((r) => ({
                      ...r,
                      category:
                        (r as { category?: string }).category ?? "Other",
                    }))}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="doh" className="space-y-6 mt-6">
            {extData && (
              <Card className="min-w-0">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>Days of Inventory on Hand</CardTitle>
                    <CardDescription>
                      Slowest moving products by days on hand
                    </CardDescription>
                  </div>
                  <ChartInfoButton content="Estimated days until stock runs out at current sell rate. Lists products with the most days on hand (slowest moving) first." />
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {(() => {
                    const list = extData.daysOnHand;
                    const totalPages = Math.max(
                      1,
                      Math.ceil(list.length / PAGE_SIZE),
                    );
                    const page = Math.min(dohPage, totalPages);
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
                                Product
                              </th>
                              <th className="text-right p-2 font-medium">
                                Stock
                              </th>
                              <th className="text-right p-2 font-medium">
                                Daily Sales
                              </th>
                              <th className="text-right p-2 font-medium">
                                Days on Hand
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((item, i) => (
                              <tr
                                key={`doh-${(page - 1) * PAGE_SIZE + i}`}
                                className="border-b border-border/50"
                              >
                                <td className="p-2 font-medium">
                                  {item.productName}
                                </td>
                                <td className="text-right p-2 text-muted-foreground tabular-nums">
                                  {item.currentStock}
                                </td>
                                <td className="text-right p-2 text-muted-foreground tabular-nums">
                                  {item.dailySalesRate}
                                </td>
                                <td
                                  className="text-right p-2 font-bold tabular-nums analytics-value"
                                  data-color={
                                    item.daysOnHand >= 999
                                      ? "red"
                                      : item.daysOnHand > 90
                                        ? "gold"
                                        : "gongabu"
                                  }
                                >
                                  {item.daysOnHand >= 999
                                    ? "∞"
                                    : `${item.daysOnHand}d`}
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
                                    setDohPage((p) => Math.max(1, p - 1))
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
                                    setDohPage((p) =>
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
          </TabsContent>

          <TabsContent value="deadstock" className="space-y-6 mt-6">
            {extData && (
              <Card className="min-w-0">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>Dead Stock</CardTitle>
                    <CardDescription>
                      Products with stock but zero sales in selected period
                    </CardDescription>
                  </div>
                  <ChartInfoButton content="Products that have inventory on hand but no sales in the selected period. Candidates for markdown or clearance." />
                </CardHeader>
                <CardContent>
                  {extData.deadStock.length === 0 ? (
                    <p className="text-center py-10 text-muted-foreground text-sm">
                      No dead stock found — all stocked products have sales in
                      this period.
                    </p>
                  ) : (
                    (() => {
                      const list = extData.deadStock;
                      const totalPages = Math.max(
                        1,
                        Math.ceil(list.length / PAGE_SIZE),
                      );
                      const page = Math.min(deadStockPage, totalPages);
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
                                    Product
                                  </th>
                                  <th className="text-right p-2 font-medium">
                                    Current Stock
                                  </th>
                                  <th className="text-right p-2 font-medium">
                                    Stock Value (Cost)
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((item, i) => (
                                  <tr
                                    key={`dead-${(page - 1) * PAGE_SIZE + i}`}
                                    className="border-b border-border/50"
                                  >
                                    <td className="p-2 font-medium">
                                      {item.productName}
                                    </td>
                                    <td className="text-right p-2 text-muted-foreground tabular-nums">
                                      {item.currentStock}
                                    </td>
                                    <td className="text-right p-2 font-semibold tabular-nums text-destructive">
                                      {fN(item.stockValue)}
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
                                      setDeadStockPage((p) =>
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
                                      setDeadStockPage((p) =>
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
                    })()
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
