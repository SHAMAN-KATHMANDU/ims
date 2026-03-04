"use client";

/**
 * Legacy analytics overview (summary cards, location bars, daily trend).
 * Superseded by Sales & Revenue analytics at reports/analytics (SalesRevenuePage).
 * Kept for reference or dashboard widgets; primary analytics use reports/analytics.
 */

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveLocations } from "@/features/locations";
import {
  useSalesSummary,
  useSalesByLocation,
  useDailySales,
  formatCurrency,
} from "@/features/sales";
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  BarChart3,
} from "lucide-react";

export function AnalyticsPage() {
  const [selectedLocation, setSelectedLocation] = useState<string>("ALL");
  const [dateRange, setDateRange] = useState<string>("30"); // days

  // Data fetching
  const { data: locations = [] } = useActiveLocations();
  const showrooms = locations.filter((l) => l.type === "SHOWROOM");

  const { data: summary, isLoading: summaryLoading } = useSalesSummary({
    locationId: selectedLocation === "ALL" ? undefined : selectedLocation,
  });

  const { data: locationStats, isLoading: locationStatsLoading } =
    useSalesByLocation();

  const { data: dailyStats, isLoading: dailyStatsLoading } = useDailySales({
    locationId: selectedLocation === "ALL" ? undefined : selectedLocation,
    days: parseInt(dateRange),
  });

  // Calculate max for bar scaling
  const maxLocationRevenue = Math.max(
    ...(locationStats?.map((s) => s.totalRevenue) || [1]),
  );

  const maxDailyRevenue = Math.max(...(dailyStats?.map((s) => s.total) || [1]));

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-3xl font-bold text-balance">Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Track your sales performance and insights
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Showrooms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Showrooms</SelectItem>
            {showrooms.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 min-w-0">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary?.totalRevenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary?.totalSales || 0} total sales
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">General Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary?.generalSales.revenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary?.generalSales.count || 0} walk-in sales
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Member Sales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary?.memberSales.revenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary?.memberSales.count || 0} member sales
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Discounts
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  -{formatCurrency(summary?.totalDiscount || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Member discount savings
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 min-w-0">
        {/* Sales by Location */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Sales by Showroom
            </CardTitle>
            <CardDescription>Revenue breakdown by location</CardDescription>
          </CardHeader>
          <CardContent>
            {locationStatsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                ))}
              </div>
            ) : locationStats && locationStats.length > 0 ? (
              <div className="space-y-4">
                {locationStats.map((stat) => (
                  <div key={stat.locationId} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{stat.locationName}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(stat.totalRevenue)} ({stat.totalSales}{" "}
                        sales)
                      </span>
                    </div>
                    <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${(stat.totalRevenue / maxLocationRevenue) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground">
                No sales data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales Type Breakdown */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Sales Type Breakdown</CardTitle>
            <CardDescription>
              General vs Member sales comparison
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="h-32 flex items-center justify-center">
                <Skeleton className="h-32 w-32 rounded-full" />
              </div>
            ) : summary ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-8">
                  <div className="text-center">
                    <div className="text-3xl font-bold">
                      {summary.totalSales > 0
                        ? Math.round(
                            (summary.generalSales.count / summary.totalSales) *
                              100,
                          )
                        : 0}
                      %
                    </div>
                    <div className="text-sm text-muted-foreground">General</div>
                    <div className="text-xs text-muted-foreground">
                      ({summary.generalSales.count} sales)
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {summary.totalSales > 0
                        ? Math.round(
                            (summary.memberSales.count / summary.totalSales) *
                              100,
                          )
                        : 0}
                      %
                    </div>
                    <div className="text-sm text-muted-foreground">Member</div>
                    <div className="text-xs text-muted-foreground">
                      ({summary.memberSales.count} sales)
                    </div>
                  </div>
                </div>
                <div className="h-4 w-full bg-secondary rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-gray-400 transition-all"
                    style={{
                      width: `${
                        summary.totalSales > 0
                          ? (summary.generalSales.count / summary.totalSales) *
                            100
                          : 50
                      }%`,
                    }}
                  />
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{
                      width: `${
                        summary.totalSales > 0
                          ? (summary.memberSales.count / summary.totalSales) *
                            100
                          : 50
                      }%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground">
                No sales data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Sales Trend */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Daily Sales Trend</CardTitle>
          <CardDescription>
            Sales revenue over the last {dateRange} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dailyStatsLoading ? (
            <div className="h-48 flex items-center justify-center">
              <Skeleton className="h-full w-full" />
            </div>
          ) : dailyStats && dailyStats.length > 0 ? (
            <div className="h-48 flex items-end gap-1">
              {dailyStats.map((stat, index) => (
                <div
                  key={stat.date}
                  className="flex-1 flex flex-col items-center gap-1 group relative"
                >
                  <div className="w-full flex flex-col gap-[1px]">
                    <div
                      className="w-full bg-blue-500 rounded-t transition-all"
                      style={{
                        height: `${Math.max(
                          (stat.member / maxDailyRevenue) * 150,
                          stat.member > 0 ? 4 : 0,
                        )}px`,
                      }}
                    />
                    <div
                      className="w-full bg-gray-400 rounded-b transition-all"
                      style={{
                        height: `${Math.max(
                          (stat.general / maxDailyRevenue) * 150,
                          stat.general > 0 ? 4 : 0,
                        )}px`,
                      }}
                    />
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block bg-popover text-popover-foreground text-xs p-2 rounded shadow-lg z-10 min-w-[100px]">
                    <div className="font-medium">{stat.date}</div>
                    <div>Total: {formatCurrency(stat.total)}</div>
                    <div className="text-blue-500">
                      Member: {formatCurrency(stat.member)}
                    </div>
                    <div className="text-gray-500">
                      General: {formatCurrency(stat.general)}
                    </div>
                    <div>Sales: {stat.count}</div>
                  </div>
                  {/* Date label - show every 7th day or first/last */}
                  {(index === 0 ||
                    index === dailyStats.length - 1 ||
                    index % 7 === 0) && (
                    <span className="text-[10px] text-muted-foreground mt-1">
                      {stat.date.slice(5)} {/* Show MM-DD */}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              No sales data available for this period
            </div>
          )}
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-400 rounded" />
              <span className="text-sm text-muted-foreground">General</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span className="text-sm text-muted-foreground">Member</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
