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
import { useAnalyticsFilters } from "@/features/analytics";
import { useFinancialAnalytics } from "@/features/analytics";
import { AnalyticsFilterBar } from "./AnalyticsFilterBar";
import { ChartInfoButton } from "./ChartInfoButton";
import { exportAnalytics } from "@/features/analytics";
import { downloadBlobFromResponse } from "@/lib/downloadBlob";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  C,
  getChartColor,
  fN,
  fS,
  fP,
  axisTick,
  gridProps,
  tooltipStyle,
  tooltipCursor,
} from "./reportTheme";
import { AnalyticsChartTooltip } from "./AnalyticsChartTooltip";

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
          label: "Net Revenue",
          value: fN(totals.totalRevenue),
          sub: "After discount",
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
      className="reports-container min-w-0 w-full max-w-full space-y-8"
      data-reports
    >
      <PageHeader
        title="Financial Analytics"
        description="Gross profit, COGS, discount ratio, and margin analysis"
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <AnalyticsFilterBar />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={exporting}>
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
              {exporting ? "..." : "Download"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => handleExport("excel")}
              disabled={exporting}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" aria-hidden="true" />
              Download as Excel
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleExport("csv")}
              disabled={exporting}
            >
              <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
              Download as CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!isLoading && kpis.length > 0 && (
        <section aria-label="Key metrics" className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Key metrics
          </h2>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {kpis.map((k, i) => {
              const isPrimary = i < 2;
              return (
                <Card key={i} className="min-w-0 border border-border/80">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {k.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={
                        isPrimary
                          ? "text-2xl font-bold tracking-tight md:text-3xl"
                          : "text-xl font-semibold"
                      }
                    >
                      {k.value}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {k.sub}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {isLoading && <Skeleton className="h-64 w-full" />}

      {!isLoading && data && (
        <>
          <Card className="min-w-0">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Gross Profit Over Time</CardTitle>
                <CardDescription>
                  Revenue, COGS, and gross profit per day
                </CardDescription>
              </div>
              <ChartInfoButton content="Daily revenue, cost of goods sold (COGS), and gross profit (revenue minus COGS). Shows how profitability evolves over time." />
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
                    <Tooltip
                      content={<AnalyticsChartTooltip />}
                      wrapperStyle={tooltipStyle}
                      contentStyle={tooltipStyle}
                      cursor={tooltipCursor}
                    />
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
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>COGS by Category</CardTitle>
                  <CardDescription>
                    Cost breakdown by product category
                  </CardDescription>
                </div>
                <ChartInfoButton content="Cost of goods sold (COGS) by product category. Shows which categories have the highest cost base." />
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
                          content={(props) => (
                            <AnalyticsChartTooltip
                              {...props}
                              formatter={(v) =>
                                typeof v === "number" ? fN(v) : String(v ?? "")
                              }
                            />
                          )}
                          wrapperStyle={tooltipStyle}
                          contentStyle={tooltipStyle}
                          cursor={tooltipCursor}
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
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>COGS by Location</CardTitle>
                  <CardDescription>Cost breakdown by location</CardDescription>
                </div>
                <ChartInfoButton content="Cost of goods sold (COGS) by location. Compares cost base across stores or warehouses." />
              </CardHeader>
              <CardContent>
                <div className="min-h-[250px] w-full">
                  {data.cogsByLocation.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={data.cogsByLocation}>
                        <CartesianGrid {...gridProps} />
                        <XAxis dataKey="locationName" tick={axisTick} />
                        <YAxis tickFormatter={fS} tick={axisTick} />
                        <Tooltip
                          content={<AnalyticsChartTooltip />}
                          wrapperStyle={tooltipStyle}
                          contentStyle={tooltipStyle}
                          cursor={tooltipCursor}
                        />
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
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Discount Ratio Trend</CardTitle>
                <CardDescription>
                  Discount as % of subtotal over time
                </CardDescription>
              </div>
              <ChartInfoButton content="Discount as a percentage of subtotal for each day. Tracks how much you are discounting over time." />
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.grossProfitTimeSeries}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="date" tick={axisTick} />
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
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Margin by Category</CardTitle>
                <CardDescription>
                  Profit margin percentage by product category
                </CardDescription>
              </div>
              <ChartInfoButton content="Profit margin (%) by product category: (revenue − COGS) / revenue. Shows which categories are most profitable." />
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
