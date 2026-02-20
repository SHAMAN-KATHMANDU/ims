"use client";

/**
 * Financial Analytics: gross profit over time, COGS breakdown, discount ratio trend, margin by category.
 */

import { useState, useCallback, useMemo } from "react";
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
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
} from "recharts";
import { useAnalyticsFilters } from "@/hooks/useAnalyticsFilters";
import { useFinancialAnalytics } from "@/hooks/useAnalytics";
import { AnalyticsFilterBar } from "./components/AnalyticsFilterBar";
import { exportAnalytics } from "@/services/analyticsService";
import { downloadBlobFromResponse } from "@/lib/downloadBlob";
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

export function FinancialPage() {
  const { apiParams } = useAnalyticsFilters();
  const { data, isLoading } = useFinancialAnalytics(apiParams);
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(
    async (format: "csv" | "excel") => {
      setExporting(true);
      try {
        const response = await exportAnalytics("financial", format, apiParams);
        downloadBlobFromResponse(
          response,
          `analytics-financial-${new Date().toISOString().slice(0, 10)}.${format === "excel" ? "xlsx" : "csv"}`,
        );
      } catch {
        /* handled */
      }
      setExporting(false);
    },
    [apiParams],
  );

  // Summary KPIs
  const totals = useMemo(() => {
    if (!data) return null;
    const totalRevenue = data.grossProfitTimeSeries.reduce(
      (s, p) => s + p.revenue,
      0,
    );
    const totalCogs = data.grossProfitTimeSeries.reduce(
      (s, p) => s + p.cogs,
      0,
    );
    const totalGross = totalRevenue - totalCogs;
    return {
      totalRevenue,
      totalCogs,
      totalGross,
      marginPct:
        totalRevenue > 0 ? +((totalGross / totalRevenue) * 100).toFixed(1) : 0,
    };
  }, [data]);

  // Filter out zero/negative COGS for PieChart (prevents broken rendering)
  const cogsByCategoryFiltered = useMemo(() => {
    if (!data) return [];
    return data.cogsByCategory.filter((item) => item.cogs > 0);
  }, [data]);

  const kpis = totals
    ? [
        {
          label: "Total Revenue",
          value: fN(totals.totalRevenue),
          sub: "Gross sales",
          icon: "💰",
        },
        {
          label: "Total COGS",
          value: fN(totals.totalCogs),
          sub: "Cost of goods sold",
          icon: "📦",
        },
        {
          label: "Gross Profit",
          value: fN(totals.totalGross),
          sub: `${fP(totals.marginPct)} margin`,
          icon: "📈",
        },
        {
          label: "Avg Margin",
          value: fP(totals.marginPct),
          sub: "Revenue - COGS",
          icon: "📊",
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
          Financial Analytics
        </h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Gross profit, COGS, discount ratio, and margin analysis
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

      {!isLoading && kpis.length > 0 && (
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

      {isLoading && <Skeleton className="h-64 w-full" />}

      {!isLoading && data && (
        <>
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Gross Profit Over Time</CardTitle>
              <CardDescription>
                Revenue, COGS, and gross profit per day
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="min-h-[280px] w-full">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data.grossProfitTimeSeries}>
                    <defs>
                      <linearGradient id="gpG" x1="0" y1="0" x2="0" y2="1">
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
                      <linearGradient id="gpR" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.red} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={C.red} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="date" tick={axisTick} />
                    <YAxis tickFormatter={fS} tick={axisTick} />
                    <Tooltip content={<DarkTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area
                      type="monotone"
                      dataKey="grossProfit"
                      stroke={C.gongabu}
                      fill="url(#gpG)"
                      strokeWidth={2}
                      name="Gross Profit"
                    />
                    <Area
                      type="monotone"
                      dataKey="cogs"
                      stroke={C.red}
                      fill="url(#gpR)"
                      strokeWidth={1.5}
                      name="COGS"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>COGS by Category</CardTitle>
                <CardDescription>
                  Cost breakdown by product category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="min-h-[250px] w-full">
                  {cogsByCategoryFiltered.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={cogsByCategoryFiltered}
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={82}
                          paddingAngle={3}
                          dataKey="cogs"
                          nameKey="category"
                          animationDuration={800}
                          minAngle={2}
                        >
                          {cogsByCategoryFiltered.map((_, i) => (
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
                  ) : (
                    <div className="flex h-[250px] items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/30 text-sm text-muted-foreground">
                      No COGS data by category in this period
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>COGS by Location</CardTitle>
                <CardDescription>Cost breakdown by location</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="min-h-[250px] w-full">
                  {data.cogsByLocation.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={data.cogsByLocation}>
                        <CartesianGrid {...gridProps} />
                        <XAxis dataKey="locationName" tick={axisTick} />
                        <YAxis tickFormatter={fS} tick={axisTick} />
                        <Tooltip content={<DarkTooltip />} />
                        <Bar dataKey="cogs" radius={[4, 4, 0, 0]} name="COGS">
                          {data.cogsByLocation.map((_, i) => (
                            <Cell key={i} fill={getChartColor(i)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[250px] items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/30 text-sm text-muted-foreground">
                      No COGS data by location in this period
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Discount Ratio Trend</CardTitle>
              <CardDescription>
                Discount as % of subtotal over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.grossProfitTimeSeries}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="date" tick={axisTick} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={axisTick} />
                  <Tooltip
                    formatter={(v: number) => `${v}%`}
                    contentStyle={tooltipStyle}
                  />
                  <Line
                    type="monotone"
                    dataKey="discountRatio"
                    stroke={C.gold}
                    strokeWidth={2}
                    name="Discount %"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Margin by Category</CardTitle>
              <CardDescription>
                Profit margin percentage by product category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer
                width="100%"
                height={Math.max(200, data.marginByCategory.length * 35)}
              >
                <BarChart data={data.marginByCategory} layout="vertical">
                  <CartesianGrid {...gridProps} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `${v}%`}
                    tick={axisTick}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tick={axisTick}
                    width={120}
                  />
                  <Tooltip
                    formatter={(v: number) => `${v}%`}
                    contentStyle={tooltipStyle}
                  />
                  <Bar
                    dataKey="marginPct"
                    radius={[0, 4, 4, 0]}
                    name="Margin %"
                  >
                    {data.marginByCategory.map((m, i) => (
                      <Cell
                        key={i}
                        fill={m.marginPct >= 0 ? C.gongabu : C.red}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
