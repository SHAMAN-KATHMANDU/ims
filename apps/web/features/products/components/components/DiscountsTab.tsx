"use client";

/**
 * Product discounts list page content (table, filters, pagination).
 * Not the form tab – see form-tabs/DiscountsTab.tsx for product form discount rows.
 */

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useProductDiscountsList,
  useCategories,
  useDiscountTypes,
  useProductsPaginated,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  type ProductDiscountListItem,
  type ProductDiscountListParams,
} from "@/features/products";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Search, Loader2, Filter } from "lucide-react";

export function DiscountsTab() {
  const [params, setParams] = useState<ProductDiscountListParams>({
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
    search: "",
    productId: undefined,
    categoryId: undefined,
    subCategoryId: undefined,
    discountTypeId: undefined,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const { data, isLoading } = useProductDiscountsList(params);
  const { data: categories = [] } = useCategories();
  const { data: discountTypes = [] } = useDiscountTypes();
  const { data: productsResponse } = useProductsPaginated({
    page: 1,
    limit: 200,
  });
  const products = productsResponse?.data ?? [];

  const discounts = data?.data ?? [];
  const pagination = data?.pagination;

  const handleSearchChange = useCallback((value: string) => {
    setParams((prev) => ({
      ...prev,
      page: DEFAULT_PAGE,
      search: value || undefined,
    }));
  }, []);

  const handleFilterChange = useCallback(
    (key: keyof ProductDiscountListParams, value: string | undefined) => {
      setParams((prev: ProductDiscountListParams) => ({
        ...prev,
        page: DEFAULT_PAGE,
        [key]: value === "all" || !value ? undefined : value,
      }));
    },
    [],
  );

  const handleSortChange = useCallback(
    (sortBy: string, sortOrder: "asc" | "desc") => {
      setParams((prev: ProductDiscountListParams) => ({
        ...prev,
        page: DEFAULT_PAGE,
        sortBy,
        sortOrder,
      }));
    },
    [],
  );

  const handlePageChange = useCallback((page: number) => {
    setParams((prev: ProductDiscountListParams) => ({ ...prev, page }));
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setParams((prev: ProductDiscountListParams) => ({
      ...prev,
      page: DEFAULT_PAGE,
      limit: pageSize,
    }));
  }, []);

  const formatValue = (d: ProductDiscountListItem) => {
    if (d.valueType === "PERCENTAGE") {
      return `${Number(d.value)}%`;
    }
    return `₹${Number(d.value).toFixed(2)}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">All Discounts</h2>
        <p className="text-sm text-muted-foreground">
          View and filter product discounts. To add or edit discounts, edit the
          product.
        </p>
      </div>

      {/* Minimal filter bar – same style as product catalog */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
        <div className="relative flex-1 min-w-[180px] max-w-[280px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search product or type..."
            value={params.search ?? ""}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-sm">
              <Filter className="h-3.5 w-3.5" />
              Filters
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">
                Filter by
              </p>
              <div className="grid gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Product</Label>
                  <Select
                    value={params.productId ?? "all"}
                    onValueChange={(v) => handleFilterChange("productId", v)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} (
                          {(p as { variations?: Array<{ imsCode?: string }> })
                            .variations?.[0]?.imsCode ?? "—"}
                          )
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select
                    value={params.categoryId ?? "all"}
                    onValueChange={(v) => handleFilterChange("categoryId", v)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Discount type</Label>
                  <Select
                    value={params.discountTypeId ?? "all"}
                    onValueChange={(v) =>
                      handleFilterChange("discountTypeId", v)
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {discountTypes.map((dt) => (
                        <SelectItem key={dt.id} value={dt.id}>
                          {dt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Sort</Label>
                  <Select
                    value={`${params.sortBy ?? "createdAt"}-${params.sortOrder ?? "desc"}`}
                    onValueChange={(v) => {
                      const [sortBy, sortOrder] = v.split("-") as [
                        string,
                        "asc" | "desc",
                      ];
                      handleSortChange(sortBy, sortOrder);
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt-desc">
                        Newest first
                      </SelectItem>
                      <SelectItem value="createdAt-asc">
                        Oldest first
                      </SelectItem>
                      <SelectItem value="productName-asc">
                        Product A–Z
                      </SelectItem>
                      <SelectItem value="productName-desc">
                        Product Z–A
                      </SelectItem>
                      <SelectItem value="discountTypeName-asc">
                        Type A–Z
                      </SelectItem>
                      <SelectItem value="discountTypeName-desc">
                        Type Z–A
                      </SelectItem>
                      <SelectItem value="value-desc">Value high–low</SelectItem>
                      <SelectItem value="value-asc">Value low–high</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Discounts</CardTitle>
          <CardDescription>
            {pagination ? `${pagination.totalItems} discount(s)` : "Loading…"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Subcategory</TableHead>
                    <TableHead>Discount Type</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discounts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-muted-foreground py-8"
                      >
                        No discounts found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    discounts.map((discount) => (
                      <TableRow key={discount.id}>
                        <TableCell className="font-medium">
                          {discount.product.name}
                          <span className="text-muted-foreground text-xs block">
                            {(
                              discount.product as {
                                variations?: Array<{ imsCode?: string }>;
                              }
                            ).variations?.[0]?.imsCode ?? discount.product.name}
                          </span>
                        </TableCell>
                        <TableCell>
                          {discount.product.category?.name ?? "-"}
                        </TableCell>
                        <TableCell>
                          {discount.product.subCategory ?? "-"}
                        </TableCell>
                        <TableCell>
                          {discount.discountType?.name ?? "Unknown"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatValue(discount)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              discount.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {discount.isActive ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {discount.startDate
                            ? new Date(discount.startDate).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {discount.endDate
                            ? new Date(discount.endDate).toLocaleDateString()
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {pagination && (
                <DataTablePagination
                  pagination={{
                    currentPage: pagination.currentPage,
                    totalPages: pagination.totalPages,
                    totalItems: pagination.totalItems,
                    itemsPerPage: pagination.itemsPerPage,
                    hasNextPage: pagination.hasNextPage,
                    hasPrevPage: pagination.hasPrevPage,
                  }}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
