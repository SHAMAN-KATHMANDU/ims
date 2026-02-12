"use client";

/**
 * Trends & Patterns Analytics: MoM growth, seasonality, cohort retention matrix, peak hours heatmap.
 */

import { useState, useMemo, useCallback } from "react";
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
  LineChart,
  Line,
} from "recharts";
import { useAnalyticsFilters } from "@/hooks/useAnalyticsFilters";
import {
  useTrendsAnalytics,
  useSalesRevenueAnalytics,
} from "@/hooks/useAnalytics";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  C,
  fN,
  fS,
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

export function TrendsPage() {
  const { apiParams } = useAnalyticsFilters();
  const { data, isLoading } = useTrendsAnalytics(apiParams);
  const { data: salesData } = useSalesRevenueAnalytics(apiParams);
  const [view, setView] = useState<
    "growth" | "seasonality" | "cohort" | "peak"
  >("growth");
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(
    async (format: "csv" | "excel") => {
      setExporting(true);
      try {
        const response = await exportAnalytics("trends", format, apiParams);
        downloadBlobFromResponse(
          response,
          `analytics-trends-${new Date().toISOString().slice(0, 10)}.${format === "excel" ? "xlsx" : "csv"}`,
        );
      } catch {
        /* handled */
      }
      setExporting(false);
    },
    [apiParams],
  );

  // Moving averages from daily data
  const movingAvgData = useMemo(() => {
    const ts = salesData?.timeSeries ?? [];
    if (ts.length === 0) return [];
    return ts.map((point, i) => {
      const start7 = Math.max(0, i - 6);
      const start30 = Math.max(0, i - 29);
      const slice7 = ts.slice(start7, i + 1);
      const slice30 = ts.slice(start30, i + 1);
      const avg7 = slice7.reduce((s, p) => s + p.net, 0) / slice7.length;
      const avg30 = slice30.reduce((s, p) => s + p.net, 0) / slice30.length;
      return {
        date: point.date,
        net: point.net,
        ma7: Math.round(avg7),
        ma30: Math.round(avg30),
      };
    });
  }, [salesData]);

  // Peak hours heatmap data: flatten for display
  const peakMax = useMemo(() => {
    if (!data?.peakHours) return 1;
    let max = 1;
    for (const day of data.peakHours) {
      for (const h of day.hours) {
        if (h.revenue > max) max = h.revenue;
      }
    }
    return max;
  }, [data]);

  return (
    <div
      className="reports-container min-w-0 w-full max-w-full space-y-6"
      data-reports
    >
      <header>
        <h1 className="text-2xl font-bold text-balance md:text-3xl">
          Trends & Patterns Analytics
        </h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Growth rates, seasonality, cohort retention, and peak patterns
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

      {isLoading && <Skeleton className="h-64 w-full" />}

      {!isLoading && data && (
        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="growth">Growth</TabsTrigger>
            <TabsTrigger value="seasonality">Seasonality</TabsTrigger>
            <TabsTrigger value="cohort">Cohort</TabsTrigger>
            <TabsTrigger value="peak">Peak Hours</TabsTrigger>
          </TabsList>

          <TabsContent value="growth" className="space-y-6 mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle>MoM Growth Rates</CardTitle>
                  <CardDescription>
                    Month-over-month revenue change
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.monthlyTotals}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="month" tick={axisTick} />
                      <YAxis tickFormatter={(v) => `${v}%`} tick={axisTick} />
                      <Tooltip
                        formatter={(v: number) => `${v}%`}
                        contentStyle={tooltipStyle}
                      />
                      <Bar
                        dataKey="momGrowth"
                        radius={[4, 4, 0, 0]}
                        name="MoM Growth"
                      >
                        {data.monthlyTotals.map((m, i) => (
                          <Cell
                            key={i}
                            fill={
                              m.momGrowth > 0
                                ? C.gongabu
                                : m.momGrowth < 0
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
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle>Monthly Totals</CardTitle>
                  <CardDescription>
                    Monthly revenue and transaction count
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.monthlyTotals}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="month" tick={axisTick} />
                      <YAxis tickFormatter={fS} tick={axisTick} />
                      <Tooltip content={<DarkTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar
                        dataKey="revenue"
                        fill={C.accent}
                        radius={[4, 4, 0, 0]}
                        name="Revenue"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {movingAvgData.length > 0 && (
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle>Moving Averages</CardTitle>
                  <CardDescription>
                    Daily net revenue with 7-day and 30-day moving averages
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={movingAvgData}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="date" tick={axisTick} />
                      <YAxis tickFormatter={fS} tick={axisTick} />
                      <Tooltip content={<DarkTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line
                        type="monotone"
                        dataKey="net"
                        stroke={C.td}
                        strokeWidth={1}
                        name="Daily"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="ma7"
                        stroke={C.thamel}
                        strokeWidth={2}
                        name="7-day MA"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="ma30"
                        stroke={C.accent}
                        strokeWidth={2}
                        name="30-day MA"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="seasonality" className="space-y-6 mt-6">
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>Seasonality Index</CardTitle>
                <CardDescription>
                  Month avg / overall avg × 100 (100 = average)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.seasonalityIndex}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="month" tick={axisTick} />
                    <YAxis tick={axisTick} domain={[0, "auto"]} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: number) => `${v}`}
                    />
                    <Bar
                      dataKey="index"
                      radius={[4, 4, 0, 0]}
                      name="Seasonality Index"
                    >
                      {data.seasonalityIndex.map((s, i) => (
                        <Cell
                          key={i}
                          fill={Number(s.index) >= 100 ? C.gongabu : C.red}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-center text-xs text-muted-foreground mt-2">
                  Index above 100 = above average month. Below 100 = below
                  average.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cohort" className="space-y-6 mt-6">
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>Cohort Retention Matrix</CardTitle>
                <CardDescription>
                  Members grouped by first purchase month; % that returned in
                  subsequent months
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.cohortRetention.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    No cohort data available.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="border-collapse text-[11px] w-full">
                      <thead>
                        <tr>
                          <th className="p-2 sm:p-3 text-muted-foreground font-medium text-left sticky left-0 bg-card">
                            Cohort
                          </th>
                          <th className="p-2 sm:p-3 text-muted-foreground font-medium">
                            Size
                          </th>
                          {Array.from(
                            {
                              length: Math.min(
                                12,
                                Math.max(
                                  ...data.cohortRetention.map(
                                    (c) => c.retention.length,
                                  ),
                                ),
                              ),
                            },
                            (_, i) => (
                              <th
                                key={i}
                                className="p-2 sm:p-3 text-muted-foreground font-medium"
                              >
                                M+{i}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {data.cohortRetention.map((cohort) => (
                          <tr key={cohort.cohortMonth}>
                            <td className="p-2 sm:p-3 font-semibold font-mono tabular-nums sticky left-0 bg-card">
                              {cohort.cohortMonth}
                            </td>
                            <td className="p-2 sm:p-3 font-mono tabular-nums text-center">
                              {cohort.size}
                            </td>
                            {Array.from(
                              {
                                length: Math.min(
                                  12,
                                  Math.max(
                                    ...data.cohortRetention.map(
                                      (c) => c.retention.length,
                                    ),
                                  ),
                                ),
                              },
                              (_, i) => {
                                const r = cohort.retention[i];
                                if (!r)
                                  return <td key={i} className="p-2 sm:p-3" />;
                                const rate = Number(r.rate);
                                const opacity = rate / 100;
                                return (
                                  <td
                                    key={i}
                                    className={`p-2 sm:p-3 text-center font-mono tabular-nums ${rate > 50 ? "text-foreground" : "text-muted-foreground"}`}
                                    style={{
                                      background: `rgba(63, 185, 80, ${opacity * 0.4})`,
                                    }}
                                  >
                                    {rate}%
                                  </td>
                                );
                              },
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="peak" className="space-y-6 mt-6">
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>Peak Hours Heatmap</CardTitle>
                <CardDescription>
                  Revenue by day of week and hour of day
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.peakHours.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    No peak hours data.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="border-collapse text-[10px] w-full">
                      <thead>
                        <tr>
                          <th className="py-1.5 px-2 text-muted-foreground font-medium" />
                          {Array.from({ length: 24 }, (_, h) => (
                            <th
                              key={h}
                              className="p-1.5 min-w-[30px] text-center text-muted-foreground font-normal"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.peakHours.map((day) => (
                          <tr key={day.day}>
                            <td className="py-1.5 px-2 font-semibold text-muted-foreground">
                              {day.day}
                            </td>
                            {day.hours.map((h) => {
                              const intensity =
                                peakMax > 0 ? h.revenue / peakMax : 0;
                              return (
                                <td
                                  key={h.hour}
                                  className={`p-1.5 text-center font-mono tabular-nums rounded-sm ${intensity > 0.5 ? "text-white" : "text-muted-foreground"}`}
                                  style={{
                                    background:
                                      intensity > 0
                                        ? `rgba(201, 136, 90, ${intensity * 0.8})`
                                        : "transparent",
                                  }}
                                >
                                  {h.revenue > 0 ? fS(h.revenue) : ""}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
