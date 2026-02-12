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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useAnalyticsFilters } from "@/hooks/useAnalyticsFilters";
import {
  useInventoryOpsAnalytics,
  useInventoryExtendedAnalytics,
} from "@/hooks/useAnalytics";
import { AnalyticsFilterBar } from "./components/AnalyticsFilterBar";
import { HeatmapTable } from "@/components/charts";
import { exportAnalytics } from "@/services/analyticsService";
import { downloadBlobFromResponse } from "@/lib/downloadBlob";
import {
  C,
  getChartColor,
  fN,
  tooltipStyle,
  axisTick,
  gridProps,
} from "./reportTheme";

const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 600, color: C.text, marginBottom: 6 }}>
        {label}
      </div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || C.text, marginBottom: 2 }}>
          {p.name}: {typeof p.value === "number" ? fN(p.value) : p.value}
        </div>
      ))}
    </div>
  );
};

function ProgressBar({
  v,
  mx,
  color,
}: {
  v: number;
  mx: number;
  color?: string;
}) {
  return (
    <div className="h-1.5 w-full rounded bg-muted overflow-hidden">
      <div
        className="h-full rounded transition-[width]"
        style={{
          width: `${Math.min((v / mx) * 100, 100)}%`,
          backgroundColor: color ?? "var(--primary)",
        }}
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
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="doh">Days on Hand</TabsTrigger>
            <TabsTrigger value="deadstock">Dead Stock</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle>Inventory Aging</CardTitle>
                  <CardDescription>Stock value by age bucket</CardDescription>
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
                                className="font-semibold tabular-nums"
                                style={{ color: b.color }}
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
                <CardHeader>
                  <CardTitle>Transfer Funnel</CardTitle>
                  <CardDescription>Pending → Completed</CardDescription>
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
                                className="font-semibold tabular-nums"
                                style={{ color: s.color }}
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
                <CardHeader>
                  <CardTitle>Sell-Through by Location</CardTitle>
                  <CardDescription>
                    Units sold / (sold + stock) per location
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={extData.sellThroughByLocation}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="locationName" tick={axisTick} />
                      <YAxis tickFormatter={(v) => `${v}%`} tick={axisTick} />
                      <Tooltip
                        formatter={(v: number) => `${v}%`}
                        contentStyle={tooltipStyle}
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
                <CardHeader>
                  <CardTitle>Stock Heatmap</CardTitle>
                  <CardDescription>
                    Categories × locations (stock value)
                  </CardDescription>
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
                <CardHeader>
                  <CardTitle>Days of Inventory on Hand</CardTitle>
                  <CardDescription>
                    Slowest moving products by days on hand
                  </CardDescription>
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
                                  className="text-right p-2 font-bold tabular-nums"
                                  style={{
                                    color:
                                      item.daysOnHand >= 999
                                        ? C.red
                                        : item.daysOnHand > 90
                                          ? C.gold
                                          : C.gongabu,
                                  }}
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
                <CardHeader>
                  <CardTitle>Dead Stock</CardTitle>
                  <CardDescription>
                    Products with stock but zero sales in selected period
                  </CardDescription>
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
