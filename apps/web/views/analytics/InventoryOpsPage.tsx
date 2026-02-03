"use client";

/**
 * Inventory & Operations Analytics: KPIs, health quadrant, heatmap, aging, transfer funnel.
 * Admin/superAdmin only; uses shared URL-based filters.
 */

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAnalyticsFilters } from "@/hooks/useAnalyticsFilters";
import { useInventoryOpsAnalytics } from "@/hooks/useAnalytics";
import { AnalyticsFilterBar } from "./components/AnalyticsFilterBar";
import { TransferFunnel, HeatmapTable } from "@/components/charts";
import {
  ReportsAgingBar,
  ReportsQuadrantChart,
} from "@/components/reports-charts";
import { formatCurrency } from "@/lib/format";
import { Package, AlertTriangle, Box, Truck } from "lucide-react";

export function InventoryOpsPage() {
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { apiParams } = useAnalyticsFilters();
  const { data, isLoading } = useInventoryOpsAnalytics(apiParams);
  const [primaryKpiMetric, setPrimaryKpiMetric] = useState<
    "stockValueCost" | "stockValueMrp" | "lowStockCount"
  >("stockValueCost");

  const primaryKpiValue = data
    ? primaryKpiMetric === "stockValueCost"
      ? formatCurrency(data.kpis.totalStockValueCost)
      : primaryKpiMetric === "stockValueMrp"
        ? formatCurrency(data.kpis.totalStockValueMrp)
        : String(data.kpis.lowStockCount)
    : null;
  const primaryKpiSublabel =
    primaryKpiMetric === "stockValueCost"
      ? "At cost price"
      : primaryKpiMetric === "stockValueMrp"
        ? "At MRP"
        : "Items ≤ 5 units";

  const kpiItems = data
    ? [
        {
          label: "Stock value (cost)",
          value: formatCurrency(data.kpis.totalStockValueCost),
          sublabel: "At cost price",
          icon: Package,
        },
        {
          label: "Stock value (MRP)",
          value: formatCurrency(data.kpis.totalStockValueMrp),
          sublabel: "At MRP",
          icon: Box,
        },
        {
          label: "Low stock count",
          value: String(data.kpis.lowStockCount),
          sublabel: "Items ≤ 5 units",
          icon: AlertTriangle,
          href: `${basePath}/product?lowStock=1`,
        },
        {
          label: "Out of stock",
          value: String(data.kpis.outOfStockCount),
          sublabel: "Items at 0",
          icon: AlertTriangle,
        },
        {
          label: "Dead stock value",
          value: formatCurrency(data.kpis.deadStockValue),
          sublabel: "No sales (90d)",
          icon: Package,
        },
      ]
    : [];

  const agingData = data
    ? [
        { bucket: "0-30 days", value: data.aging["0-30"] },
        { bucket: "31-60 days", value: data.aging["31-60"] },
        { bucket: "61-90 days", value: data.aging["61-90"] },
        { bucket: "90+ days", value: data.aging["90+"] },
      ]
    : [];

  return (
    <div
      className="reports-container min-w-0 w-full max-w-full space-y-6 overflow-x-auto"
      data-reports
    >
      <header>
        <h1 className="text-2xl font-bold text-balance md:text-3xl">
          Inventory & Operations Analytics
        </h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Inventory health, stock movement, and operational efficiency
        </p>
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
                  v as "stockValueCost" | "stockValueMrp" | "lowStockCount",
                )
              }
            >
              <SelectTrigger className="h-7 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stockValueCost">
                  Stock value (cost)
                </SelectItem>
                <SelectItem value="stockValueMrp">Stock value (MRP)</SelectItem>
                <SelectItem value="lowStockCount">Low stock count</SelectItem>
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

      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <Card className="min-w-0 shadow-sm">
          <CardHeader>
            <CardTitle>Inventory health</CardTitle>
            <CardDescription>
              Sales velocity vs stock quantity (per product)
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 overflow-hidden">
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : data?.healthQuadrant?.length ? (
              <ReportsQuadrantChart
                data={data.healthQuadrant.slice(0, 50).map((p) => ({
                  name: p.name,
                  velocity: p.velocity,
                  quantity: p.quantity,
                }))}
                xLabel="Velocity"
                yLabel="Quantity"
                width={400}
                height={260}
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No data
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 shadow-sm">
          <CardHeader>
            <CardTitle>Stock heatmap</CardTitle>
            <CardDescription>
              Categories × locations (stock value)
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 overflow-x-auto">
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : data?.heatmap?.length ? (
              <HeatmapTable
                rows={data.heatmap.map((r) => ({
                  ...r,
                  category: (r as { category?: string }).category ?? "Other",
                }))}
              />
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <Card className="min-w-0 shadow-sm">
          <CardHeader>
            <CardTitle>Inventory aging</CardTitle>
            <CardDescription>
              Stock value by age bucket (days since first recorded)
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 overflow-hidden">
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ReportsAgingBar
                data={agingData}
                formatValue={formatCurrency}
                xLabel="Amount"
                yLabel="Bucket"
                height={180}
              />
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 shrink-0" />
              Transfer funnel
            </CardTitle>
            <CardDescription>
              Pending → Approved → In transit → Completed
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 overflow-hidden">
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : data?.transferFunnel ? (
              <>
                <TransferFunnel data={data.transferFunnel} />
                <p className="text-xs text-muted-foreground mt-3">
                  Avg completion:{" "}
                  {data.avgTransferCompletionDays != null
                    ? `${data.avgTransferCompletionDays.toFixed(1)} days`
                    : "-"}
                </p>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No data
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
