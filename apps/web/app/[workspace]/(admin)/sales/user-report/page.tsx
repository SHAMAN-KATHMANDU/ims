"use client";

import { useState, useCallback } from "react";
import {
  useMySales,
  useSale,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  type Sale,
  type SaleType,
} from "@/features/sales";
import { SalesTable, SaleDetail } from "@/features/sales";
import {
  DataTablePagination,
  type PaginationState,
} from "@/components/ui/data-table-pagination";
import { UserSalesReportFilterBar } from "@/features/sales";
import { useActiveLocations } from "@/features/locations";
import {
  format,
  startOfDay,
  endOfDay,
  subDays,
  subMonths,
  subYears,
} from "date-fns";

export default function UserSalesReportPage() {
  const today = new Date();
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  // Filter state
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [sortBy, setSortBy] = useState<
    "createdAt" | "total" | "subtotal" | "saleCode"
  >("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [typeFilter, setTypeFilter] = useState<SaleType | "ALL">("ALL");
  const [creditFilter, setCreditFilter] = useState<
    "ALL" | "credit" | "non-credit"
  >("ALL");
  const [locationFilter, setLocationFilter] = useState<string>("ALL");

  const { data: response, isLoading } = useMySales({
    page,
    limit: pageSize,
    startDate: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
    endDate: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
    sortBy,
    sortOrder,
    type: typeFilter === "ALL" ? undefined : typeFilter,
    isCreditSale:
      creditFilter === "credit"
        ? true
        : creditFilter === "non-credit"
          ? false
          : undefined,
    locationId: locationFilter === "ALL" ? undefined : locationFilter,
  });
  const sales = response?.data ?? [];
  const pagination = response?.pagination;
  const { data: selectedSale } = useSale(selectedSaleId ?? "");

  const { data: locations = [] } = useActiveLocations();
  const showrooms = locations.filter((l) => l.type === "SHOWROOM");

  const dateShortcuts = [
    { label: "All time", start: undefined, end: undefined },
    { label: "Today", start: startOfDay(today), end: endOfDay(today) },
    {
      label: "Last 7 days",
      start: startOfDay(subDays(today, 6)),
      end: endOfDay(today),
    },
    {
      label: "Last 30 days",
      start: startOfDay(subDays(today, 29)),
      end: endOfDay(today),
    },
    {
      label: "Last 3 months",
      start: startOfDay(subMonths(today, 2)),
      end: endOfDay(today),
    },
    {
      label: "Last year",
      start: startOfDay(subYears(today, 1)),
      end: endOfDay(today),
    },
  ];

  const hasActiveFilters =
    !!startDate ||
    !!endDate ||
    typeFilter !== "ALL" ||
    creditFilter !== "ALL" ||
    locationFilter !== "ALL";

  const handleSortChange = useCallback((value: string) => {
    const [field, order] = value.split("_") as [
      "createdAt" | "total" | "subtotal" | "saleCode",
      "asc" | "desc",
    ];
    setSortBy(field);
    setSortOrder(order);
    setPage(DEFAULT_PAGE);
  }, []);

  const handleTypeChange = useCallback((value: string) => {
    setTypeFilter(value as SaleType | "ALL");
    setPage(DEFAULT_PAGE);
  }, []);

  const handleCreditChange = useCallback((value: string) => {
    setCreditFilter(value as "ALL" | "credit" | "non-credit");
    setPage(DEFAULT_PAGE);
  }, []);

  const handleLocationChange = useCallback((value: string) => {
    setLocationFilter(value);
    setPage(DEFAULT_PAGE);
  }, []);

  const clearDateFilters = useCallback(() => {
    setStartDate(undefined);
    setEndDate(undefined);
    setPage(DEFAULT_PAGE);
  }, []);

  const applyDateShortcut = useCallback((start?: Date, end?: Date) => {
    setStartDate(start);
    setEndDate(end);
    setPage(DEFAULT_PAGE);
  }, []);

  const clearAllFilters = useCallback(() => {
    setStartDate(undefined);
    setEndDate(undefined);
    setTypeFilter("ALL");
    setCreditFilter("ALL");
    setLocationFilter("ALL");
    setPage(DEFAULT_PAGE);
  }, []);

  const salesPagination: PaginationState | null = pagination
    ? {
        currentPage: pagination.currentPage,
        totalPages: pagination.totalPages,
        totalItems: pagination.totalItems,
        itemsPerPage: pagination.itemsPerPage,
        hasNextPage: pagination.hasNextPage,
        hasPrevPage: pagination.hasPrevPage,
      }
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Sales Report</h1>
        <p className="text-muted-foreground mt-2">
          Your full sales activity history
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <UserSalesReportFilterBar
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={(date) => {
            setStartDate(date);
            setPage(DEFAULT_PAGE);
          }}
          onEndDateChange={(date) => {
            setEndDate(date);
            setPage(DEFAULT_PAGE);
          }}
          onClearDates={clearDateFilters}
          typeFilter={typeFilter}
          onTypeChange={handleTypeChange}
          creditFilter={creditFilter}
          onCreditChange={handleCreditChange}
          locationFilter={locationFilter}
          onLocationChange={handleLocationChange}
          showrooms={showrooms}
          dateShortcuts={dateShortcuts}
          onDateShortcut={applyDateShortcut}
          hasActiveFilters={hasActiveFilters}
          onClearAllFilters={clearAllFilters}
        />
      </div>

      <SalesTable
        sales={sales}
        isLoading={isLoading}
        onView={(sale: Sale) => setSelectedSaleId(sale.id)}
        currentPage={page}
        itemsPerPage={pageSize}
      />

      {salesPagination && (
        <DataTablePagination
          pagination={salesPagination}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(DEFAULT_PAGE);
          }}
        />
      )}

      {selectedSale && (
        <SaleDetail
          sale={selectedSale}
          open={!!selectedSaleId}
          onOpenChange={(open) => !open && setSelectedSaleId(null)}
        />
      )}
    </div>
  );
}
