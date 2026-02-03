"use client";

import { useState } from "react";
import { useToast } from "@/hooks/useToast";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useSalesSummary,
  useSalesByLocation,
  formatCurrency,
} from "@/hooks/useSales";
import { useActiveLocations } from "@/hooks/useLocation";
import { downloadSales } from "@/services/salesService";
import {
  DollarSign,
  ShoppingCart,
  Users,
  BarChart3,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import {
  format,
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";

const DATE_SHORTCUTS = [
  { label: "Today", getRange: () => ({ start: startOfDay(new Date()), end: endOfDay(new Date()) }) },
  { label: "Yesterday", getRange: () => ({ start: startOfDay(subDays(new Date(), 1)), end: endOfDay(subDays(new Date(), 1)) }) },
  { label: "This week", getRange: () => ({ start: startOfWeek(new Date(), { weekStartsOn: 0 }), end: endOfWeek(new Date(), { weekStartsOn: 0 }) }) },
  { label: "This month", getRange: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
  { label: "Last 3 months", getRange: () => ({ start: startOfDay(subMonths(new Date(), 3)), end: endOfDay(new Date()) }) },
];

export function FinanceReportPage() {
  const { toast } = useToast();
  const [locationId, setLocationId] = useState<string>("ALL");
  const [dateShortcut, setDateShortcut] = useState<string>("This month");

  const shortcut = DATE_SHORTCUTS.find((s) => s.label === dateShortcut);
  const range = shortcut?.getRange();
  const startDate = range ? format(range.start, "yyyy-MM-dd") : undefined;
  const endDate = range ? format(range.end, "yyyy-MM-dd") : undefined;

  const { data: locations = [] } = useActiveLocations();
  const showrooms = locations.filter((l) => l.type === "SHOWROOM");

  const { data: summary, isLoading: summaryLoading } = useSalesSummary({
    locationId: locationId === "ALL" ? undefined : locationId,
    startDate,
    endDate,
  });

  const { data: locationStats, isLoading: locationStatsLoading } =
    useSalesByLocation({ startDate, endDate });

  const maxLocationRevenue = Math.max(
    ...(locationStats?.map((s) => s.totalRevenue) || [1]),
  );

  const handleExport = async (format: "excel" | "csv") => {
    try {
      await downloadSales(format);
      toast({
        title: "Download started",
        description: `Sales export as ${format.toUpperCase()}`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Export failed";
      toast({
        title: "Export failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">Finance Report</h1>
          <p className="text-muted-foreground mt-2">
            Complete sales report by location, date range, and payment method
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("excel")}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
          >
            <FileText className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            Date range
          </p>
          <Select value={dateShortcut} onValueChange={setDateShortcut}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_SHORTCUTS.map((s) => (
                <SelectItem key={s.label} value={s.label}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            Showroom
          </p>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Showrooms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Showrooms</SelectItem>
              {showrooms.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                  {formatCurrency(summary?.totalRevenue ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary?.totalSales ?? 0} sales
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Discount</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-green-600">
                -{formatCurrency(summary?.totalDiscount ?? 0)}
              </div>
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
                  {formatCurrency(summary?.generalSales.revenue ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary?.generalSales.count ?? 0} walk-in
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
                  {formatCurrency(summary?.memberSales.revenue ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary?.memberSales.count ?? 0} member
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sales by location */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Sales by showroom
          </CardTitle>
          <CardDescription>
            Revenue breakdown by location for selected date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          {locationStatsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
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
            <p className="text-sm text-muted-foreground">
              No sales data for this period.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
