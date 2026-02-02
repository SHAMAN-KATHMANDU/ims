"use client";

/**
 * Customers, Products & Promotions Analytics: member KPIs, cohort, product performance, promo effectiveness.
 * Admin/superAdmin only; uses shared URL-based filters.
 */

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsFilters } from "@/hooks/useAnalyticsFilters";
import { useCustomersPromosAnalytics } from "@/hooks/useAnalytics";
import { AnalyticsFilterBar } from "./components/AnalyticsFilterBar";
import { KpiCards, BarChartByUser } from "@/components/charts";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { formatCurrency } from "@/lib/format";
import { Users, Package, Percent } from "lucide-react";
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
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(
    PRODUCT_TABLE_PAGE_SIZE,
  );

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

  const productChartData = data?.productPerformance
    ?.slice(0, 15)
    .map((p) => ({
      userId: p.productId,
      username: p.productName.slice(0, 20),
      value: p.revenue,
    })) ?? [];

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-3xl font-bold text-balance">
          Customers, Products & Promotions
        </h1>
        <p className="text-muted-foreground mt-2">
          Growth, retention, and product effectiveness
        </p>
      </div>

      <AnalyticsFilterBar />

      <KpiCards items={kpiItems} isLoading={isLoading} />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product performance
          </CardTitle>
          <CardDescription>
            Revenue, quantity sold, margin (top 15)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : productChartData.length > 0 ? (
            <BarChartByUser
              data={productChartData}
              valueLabel="Revenue"
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No product data
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Product performance table</CardTitle>
          <CardDescription>
            Revenue, quantity, and margin by product
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : data?.productPerformance?.length ? (
            <>
              <div className="overflow-x-auto">
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
                    {data.productPerformance
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
                  totalPages: Math.ceil(
                    data.productPerformance.length / productPageSize,
                  ) || 1,
                  totalItems: data.productPerformance.length,
                  itemsPerPage: productPageSize,
                  hasNextPage:
                    productPage <
                    Math.ceil(
                      data.productPerformance.length / productPageSize,
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

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Promotion effectiveness
          </CardTitle>
          <CardDescription>
            Promo usage count and total usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : data?.promoEffectiveness ? (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                Total promo uses: {data.promoEffectiveness.totalUsageCount}
              </p>
              {data.promoEffectiveness.promos.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead className="text-right">Usage count</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.promoEffectiveness.promos.map((p) => (
                        <TableRow key={p.code}>
                          <TableCell className="font-medium">{p.code}</TableCell>
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
