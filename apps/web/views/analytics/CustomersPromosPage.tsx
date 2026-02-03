"use client";

/**
 * Customers, Products & Promotions Analytics: member KPIs, cohort, product performance, promo effectiveness.
 * Admin/superAdmin only; uses shared URL-based filters.
 */

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useAnalyticsFilters } from "@/hooks/useAnalyticsFilters";
import {
  useCustomersPromosAnalytics,
  useMemberCohortAnalytics,
} from "@/hooks/useAnalytics";
import { AnalyticsFilterBar } from "./components/AnalyticsFilterBar";
import { KpiCards } from "@/components/charts";
import {
  ReportsBarChart,
  ReportsDoughnutChart,
} from "@/components/reports-charts";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { formatCurrency } from "@/lib/format";
import {
  Users,
  Package,
  Percent,
  Search,
  UserPlus,
  Repeat,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PRODUCT_TABLE_PAGE_SIZE = 10;

export function CustomersPromosPage() {
  const { apiParams } = useAnalyticsFilters();
  const { data, isLoading } = useCustomersPromosAnalytics(apiParams);
  const { data: cohortData, isLoading: cohortLoading } =
    useMemberCohortAnalytics(apiParams);
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(
    PRODUCT_TABLE_PAGE_SIZE,
  );
  const [productSearch, setProductSearch] = useState("");
  const [promoSearch, setPromoSearch] = useState("");

  const filteredProductPerformance = useMemo(() => {
    const list = data?.productPerformance ?? [];
    if (!productSearch.trim()) return list;
    const q = productSearch.trim().toLowerCase();
    return list.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) ||
        (p.productId ?? "").toLowerCase().includes(q),
    );
  }, [data?.productPerformance, productSearch]);

  const filteredPromos = useMemo(() => {
    const list = data?.promoEffectiveness?.promos ?? [];
    if (!promoSearch.trim()) return list;
    const q = promoSearch.trim().toLowerCase();
    return list.filter((p) => p.code.toLowerCase().includes(q));
  }, [data?.promoEffectiveness?.promos, promoSearch]);

  const kpiItems = data
    ? [
        {
          label: "Total members",
          value: String(data.memberKpis.totalMembers),
          sublabel: "Registered",
          icon: Users,
        },
        {
          label: "New in period",
          value: String(data.memberKpis.newInPeriod),
          sublabel: "New signups",
          icon: Users,
        },
        {
          label: "Repeat customers %",
          value: `${data.memberKpis.repeatPercent.toFixed(1)}%`,
          sublabel: "With more than one sale",
          icon: Users,
        },
      ]
    : [];

  const productChartData =
    data?.productPerformance?.slice(0, 15).map((p) => ({
      userId: p.productId,
      username: p.productName.slice(0, 20),
      value: p.revenue,
    })) ?? [];

  return (
    <div
      className="reports-container min-w-0 w-full max-w-full space-y-6 overflow-x-auto"
      data-reports
    >
      <header className="min-w-0">
        <h1 className="text-2xl font-bold text-balance md:text-3xl">
          Customers, Products & Promotions
        </h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Growth, retention, and product effectiveness
        </p>
      </header>

      <div className="min-w-0">
        <AnalyticsFilterBar />
      </div>

      <KpiCards items={kpiItems} isLoading={isLoading} />

      {/* New vs repeat customers (member cohort) */}
      <Card className="min-w-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 shrink-0" />
            New vs repeat customers
          </CardTitle>
          <CardDescription>
            Customers with one sale in period (new) vs more than one (repeat)
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 overflow-hidden">
          {cohortLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : cohortData ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-card p-4 shadow-sm min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <UserPlus className="h-4 w-4" />
                  New customers
                </div>
                <p className="text-2xl font-bold mt-1">{cohortData.newCount}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Revenue: {formatCurrency(cohortData.newRevenue)}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4 shadow-sm min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Repeat className="h-4 w-4" />
                  Repeat customers
                </div>
                <p className="text-2xl font-bold mt-1">
                  {cohortData.repeatCount}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Revenue: {formatCurrency(cohortData.repeatRevenue)}
                </p>
              </div>
              <div className="sm:col-span-2 lg:col-span-2 flex items-center justify-center min-h-[160px]">
                <ReportsDoughnutChart
                  data={[
                    { name: "New", value: cohortData.newCount, id: "new" },
                    {
                      name: "Repeat",
                      value: cohortData.repeatCount,
                      id: "repeat",
                    },
                  ].filter((d) => d.value > 0)}
                  title="Customer count"
                  formatValue={(n) => String(Math.round(n))}
                  ariaLabel="New vs repeat customer count"
                />
              </div>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              No cohort data
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 shrink-0" />
            Product performance
          </CardTitle>
          <CardDescription>
            Revenue, quantity sold, margin (top 15)
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 overflow-hidden">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : productChartData.length > 0 ? (
            <ReportsBarChart
              data={productChartData}
              valueLabel="Revenue"
              formatValue={formatCurrency}
              height={280}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No product data
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0 shadow-sm">
        <CardHeader>
          <CardTitle>Product performance table</CardTitle>
          <CardDescription>
            Revenue, quantity, and margin by product
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 overflow-x-auto">
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : data?.productPerformance?.length ? (
            <>
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by product name or ID..."
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setProductPage(1);
                  }}
                  className="pl-8 h-9 text-sm"
                  aria-label="Search product performance table"
                />
              </div>
              <div className="min-w-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProductPerformance
                      .slice(
                        (productPage - 1) * productPageSize,
                        productPage * productPageSize,
                      )
                      .map((p, i) => (
                        <TableRow
                          key={`${p.productId}-${(productPage - 1) * productPageSize + i}`}
                        >
                          <TableCell className="font-medium">
                            {p.productName}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(p.revenue)}
                          </TableCell>
                          <TableCell className="text-right">
                            {p.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(p.margin)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
              <DataTablePagination
                pagination={{
                  currentPage: productPage,
                  totalPages:
                    Math.ceil(
                      filteredProductPerformance.length / productPageSize,
                    ) || 1,
                  totalItems: filteredProductPerformance.length,
                  itemsPerPage: productPageSize,
                  hasNextPage:
                    productPage <
                    Math.ceil(
                      filteredProductPerformance.length / productPageSize,
                    ),
                  hasPrevPage: productPage > 1,
                }}
                onPageChange={setProductPage}
                onPageSizeChange={(size) => {
                  setProductPageSize(size);
                  setProductPage(1);
                }}
                pageSizeOptions={[10, 20, 30, 50]}
              />
            </>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              No product data
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 shrink-0" />
            Promotion effectiveness
          </CardTitle>
          <CardDescription>Promo usage count and total usage</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 overflow-x-auto">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : data?.promoEffectiveness ? (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                Total promo uses: {data.promoEffectiveness.totalUsageCount}
              </p>
              {data.promoEffectiveness.promos.length > 0 ? (
                <>
                  <div className="relative mb-3">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by promo code..."
                      value={promoSearch}
                      onChange={(e) => setPromoSearch(e.target.value)}
                      className="pl-8 h-9 text-sm max-w-xs"
                      aria-label="Search promo effectiveness table"
                    />
                  </div>
                  <div className="min-w-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead className="text-right">
                            Usage count
                          </TableHead>
                          <TableHead className="text-right">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPromos.map((p) => (
                          <TableRow key={p.code}>
                            <TableCell className="font-medium">
                              {p.code}
                            </TableCell>
                            <TableCell className="text-right">
                              {p.usageCount}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(p.value)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No active promos
                </p>
              )}
            </>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              No promo data
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
