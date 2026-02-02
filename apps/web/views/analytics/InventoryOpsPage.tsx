"use client";

/**
 * Inventory & Operations Analytics: KPIs, health quadrant, heatmap, aging, transfer funnel.
 * Admin/superAdmin only; uses shared URL-based filters.
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsFilters } from "@/hooks/useAnalyticsFilters";
import { useInventoryOpsAnalytics } from "@/hooks/useAnalytics";
import { AnalyticsFilterBar } from "./components/AnalyticsFilterBar";
import {
  KpiCards,
  AgingBucketsBar,
  TransferFunnel,
  HeatmapTable,
  QuadrantChart,
} from "@/components/charts";
import { formatCurrency } from "@/lib/format";
import { Package, AlertTriangle, Box, Truck } from "lucide-react";

export function InventoryOpsPage() {
  const { apiParams } = useAnalyticsFilters();
  const { data, isLoading } = useInventoryOpsAnalytics(apiParams);

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
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-3xl font-bold text-balance">
          Inventory & Operations Analytics
        </h1>
        <p className="text-muted-foreground mt-2">
          Inventory health, stock movement, and operational efficiency
        </p>
      </div>

      <AnalyticsFilterBar />

      <KpiCards items={kpiItems} isLoading={isLoading} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Inventory health</CardTitle>
            <CardDescription>
              Sales velocity vs stock quantity (per product)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : data?.healthQuadrant?.length ? (
              <QuadrantChart
                data={data.healthQuadrant.slice(0, 50)}
                xLabel="Velocity"
                yLabel="Quantity"
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No data
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Stock heatmap</CardTitle>
            <CardDescription>
              Categories × locations (stock value)
            </CardDescription>
          </CardHeader>
          <CardContent>
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Inventory aging</CardTitle>
            <CardDescription>
              Stock value by age bucket (days since first recorded)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <AgingBucketsBar data={agingData} />
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Transfer funnel
            </CardTitle>
            <CardDescription>
              Pending → Approved → In transit → Completed
            </CardDescription>
          </CardHeader>
          <CardContent>
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
