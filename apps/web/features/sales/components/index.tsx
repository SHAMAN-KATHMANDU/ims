"use client";

/**
 * Orchestrates sales list, filters, detail panel, and dialogs; uses hooks for data and mutations.
 * Do not add API calls or business rules here; use hooks and services.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { useIsMobile } from "@/hooks/useMobile";
import { useDebounce } from "@/hooks/useDebounce";
import { useActiveLocations } from "@/features/locations";
import {
  useAuthStore,
  selectIsAdmin,
  selectUserRole,
} from "@/store/auth-store";
import {
  useSaleSelectionStore,
  selectSelectedSaleIds,
  selectClearSaleSelection,
  selectSetSales,
} from "../store/sale-selection-store";
import { downloadSales } from "../services/sales.service";
import {
  useSalesPaginated,
  useSale,
  useCreateSale,
  type Sale,
  type SaleType,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "../hooks/use-sales";
import { SalesTable } from "./SalesTable";
import { NewSaleForm } from "./NewSaleForm";
import { SaleDetail } from "./SaleDetail";
import { SaleBulkUploadDialog } from "./SaleBulkUploadDialog";
import { SalesFilterBar } from "./SalesFilterBar";
import { EnvFeatureGuard, FeatureGuard } from "@/features/flags";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";
import { Can, PermissionGate } from "@/features/permissions";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  Plus,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  format,
  startOfDay,
  endOfDay,
  subDays,
  subMonths,
  subYears,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import {
  DataTablePagination,
  type PaginationState,
} from "@/components/ui/data-table-pagination";

export function SalesPage() {
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const hasAppliedUrlParams = useRef(false);
  const userRole = useAuthStore(selectUserRole);
  const isAdmin = useAuthStore(selectIsAdmin);
  const isUserRole = userRole === "user";
  const canManageSales = isAdmin || isUserRole;
  const isMobile = useIsMobile();

  // Zustand store for sale selection
  const selectedSaleIds = useSaleSelectionStore(selectSelectedSaleIds);
  const clearSelection = useSaleSelectionStore(selectClearSaleSelection);
  const setSelectedSaleIds = useSaleSelectionStore(selectSetSales);

  // Filter state
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [typeFilter, setTypeFilter] = useState<SaleType | "ALL">("ALL");
  const [creditFilter, setCreditFilter] = useState<
    "ALL" | "credit" | "non-credit"
  >("ALL");
  const [locationFilter, setLocationFilter] = useState<string>("ALL");
  const [userFilter, setUserFilter] = useState<string | undefined>(undefined);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Apply URL search params once on mount (e.g. from dashboard/analytics links)
  useEffect(() => {
    if (hasAppliedUrlParams.current) return;
    const credit = searchParams.get("credit");
    const userId = searchParams.get("userId");
    const locationId = searchParams.get("locationId");
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    if (credit || userId || locationId || start || end) {
      hasAppliedUrlParams.current = true;
      if (credit === "credit") setCreditFilter("credit");
      else if (credit === "non-credit") setCreditFilter("non-credit");
      if (userId) setUserFilter(userId);
      if (locationId && locationId !== "ALL") setLocationFilter(locationId);
      if (start) {
        const d = new Date(start);
        if (!isNaN(d.getTime())) setStartDate(startOfDay(d));
      }
      if (end) {
        const d = new Date(end);
        if (!isNaN(d.getTime())) setEndDate(endOfDay(d));
      }
      setPage(DEFAULT_PAGE);
    }
  }, [searchParams]);

  // For role "user", default date range to today (only when no URL params applied)
  useEffect(() => {
    if (
      isUserRole &&
      !hasAppliedUrlParams.current &&
      startDate === undefined &&
      endDate === undefined
    ) {
      const today = new Date();
      setStartDate(startOfDay(today));
      setEndDate(endOfDay(today));
    }
  }, [isUserRole, startDate, endDate]);

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [bulkUploadDialog, setBulkUploadDialog] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  // Data fetching with backend sorting
  const { data: salesResponse, isLoading: salesLoading } = useSalesPaginated({
    page,
    limit: pageSize,
    search: debouncedSearch,
    type: typeFilter === "ALL" ? undefined : typeFilter,
    isCreditSale:
      creditFilter === "credit"
        ? true
        : creditFilter === "non-credit"
          ? false
          : undefined,
    locationId: locationFilter === "ALL" ? undefined : locationFilter,
    createdById: userFilter,
    startDate: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
    endDate: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
    sortBy,
    sortOrder,
  });

  const sales = salesResponse?.data ?? [];

  const salesPagination: PaginationState | null = salesResponse?.pagination
    ? {
        currentPage: salesResponse.pagination.currentPage,
        totalPages: salesResponse.pagination.totalPages,
        totalItems: salesResponse.pagination.totalItems,
        itemsPerPage: salesResponse.pagination.itemsPerPage,
        hasNextPage: salesResponse.pagination.hasNextPage,
        hasPrevPage: salesResponse.pagination.hasPrevPage,
      }
    : null;

  const { data: selectedSale, isLoading: saleLoading } = useSale(
    selectedSaleId || "",
  );

  const { data: locations = [] } = useActiveLocations();
  const showrooms = locations.filter((l) => l.type === "SHOWROOM");

  // Mutations
  const createSaleMutation = useCreateSale();

  // Handlers
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
      setPage(DEFAULT_PAGE);
    },
    [],
  );

  const handleTypeChange = useCallback((value: string) => {
    setTypeFilter(value as SaleType | "ALL");
    setPage(DEFAULT_PAGE);
  }, []);

  const handleCreditFilterChange = useCallback((value: string) => {
    setCreditFilter(value as "ALL" | "credit" | "non-credit");
    setPage(DEFAULT_PAGE);
  }, []);

  const handleLocationChange = useCallback((value: string) => {
    setLocationFilter(value);
    setPage(DEFAULT_PAGE);
  }, []);

  const handleSortChange = useCallback((value: string) => {
    // Same `field_order` convention as products sort Select (underscore; last segment is asc|desc).
    const i = value.lastIndexOf("_");
    const field = i === -1 ? value : value.slice(0, i);
    const order = (i === -1 ? "desc" : value.slice(i + 1)) as "asc" | "desc";
    setSortBy(field);
    setSortOrder(order);
    setPage(DEFAULT_PAGE);
  }, []);

  const handleColumnSort = useCallback(
    (newSortBy: string, newSortOrder: "asc" | "desc" | "none") => {
      if (newSortOrder === "none") {
        setSortBy("createdAt");
        setSortOrder("desc");
      } else {
        setSortBy(newSortBy);
        setSortOrder(newSortOrder);
      }
      setPage(DEFAULT_PAGE);
    },
    [],
  );

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(DEFAULT_PAGE);
  }, []);

  const handleView = (sale: Sale) => {
    setSelectedSaleId(sale.id);
  };

  const handleCreateSale = async (
    data: Parameters<typeof createSaleMutation.mutateAsync>[0],
  ) => {
    try {
      await createSaleMutation.mutateAsync(data);
      toast({ title: "Sale completed successfully" });
      setFormOpen(false);
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const message =
        err.response?.data?.message ||
        (error instanceof Error ? error.message : "Failed to create sale");
      toast({
        title: "Error creating sale",
        description: message,
        variant: "destructive",
      });
    }
  };

  const clearDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setPage(DEFAULT_PAGE);
  };

  const clearAllFilters = useCallback(() => {
    setSearch("");
    setTypeFilter("ALL");
    setCreditFilter("ALL");
    setLocationFilter("ALL");
    setUserFilter(undefined);
    setStartDate(undefined);
    setEndDate(undefined);
    setPage(DEFAULT_PAGE);
  }, []);

  const hasActiveFilters =
    search !== "" ||
    typeFilter !== "ALL" ||
    creditFilter !== "ALL" ||
    locationFilter !== "ALL" ||
    userFilter != null ||
    startDate != null ||
    endDate != null;

  const today = new Date();
  const allDateShortcuts = [
    { label: "Today", start: startOfDay(today), end: endOfDay(today) },
    {
      label: "Yesterday",
      start: startOfDay(subDays(today, 1)),
      end: endOfDay(subDays(today, 1)),
    },
    {
      label: "This week",
      start: startOfWeek(today, { weekStartsOn: 0 }),
      end: endOfWeek(today, { weekStartsOn: 0 }),
    },
    {
      label: "6 months",
      start: startOfDay(subMonths(today, 6)),
      end: endOfDay(today),
    },
    {
      label: "1 year",
      start: startOfDay(subYears(today, 1)),
      end: endOfDay(today),
    },
  ];
  const dateShortcuts = isUserRole
    ? allDateShortcuts.slice(0, 2)
    : allDateShortcuts;

  const applyDateShortcut = useCallback((start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
    setPage(DEFAULT_PAGE);
  }, []);

  // Export handlers
  const handleExport = useCallback(
    async (format: "excel" | "csv") => {
      try {
        // Get selected sale IDs or undefined (which means export all)
        const saleIdsToExport =
          selectedSaleIds.size > 0 ? Array.from(selectedSaleIds) : undefined;

        // Call backend download endpoint
        await downloadSales(format, saleIdsToExport);

        const count =
          saleIdsToExport?.length || salesResponse?.pagination?.totalItems || 0;
        toast({
          title: "Download started",
          description: `Downloading ${count} sale(s) as ${format.toUpperCase()}`,
        });

        // Clear selection after export
        if (selectedSaleIds.size > 0) {
          clearSelection();
        }
      } catch (error: unknown) {
        const err = error as { message?: string };
        toast({
          title: "Download failed",
          description: err.message || "Failed to download sales",
          variant: "destructive",
        });
      }
    },
    [
      selectedSaleIds,
      salesResponse?.pagination?.totalItems,
      toast,
      clearSelection,
    ],
  );

  return (
    <PermissionGate perm="SALES.SALES.VIEW">
      <div className="space-y-6 min-w-0 w-full pb-24">
        <PageHeader
          title="Sales"
          description="Track and manage sales from showrooms"
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between min-w-0">
          <SalesFilterBar
            search={search}
            onSearchChange={handleSearchChange}
            typeFilter={typeFilter}
            onTypeChange={handleTypeChange}
            creditFilter={creditFilter}
            onCreditChange={handleCreditFilterChange}
            locationFilter={locationFilter}
            onLocationChange={handleLocationChange}
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
            onClearAllFilters={clearAllFilters}
            hasActiveFilters={hasActiveFilters}
            showrooms={showrooms}
            dateShortcuts={dateShortcuts}
            onDateShortcut={applyDateShortcut}
            isUserRole={isUserRole}
            today={today}
          />

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Can perm="SALES.SALES.EXPORT">
              {canManageSales && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                        Download
                        {selectedSaleIds.size > 0 && (
                          <span className="ml-2 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-xs">
                            {selectedSaleIds.size}
                          </span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleExport("excel")}
                        disabled={salesLoading}
                      >
                        <FileSpreadsheet
                          className="h-4 w-4 mr-2"
                          aria-hidden="true"
                        />
                        Download as Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExport("csv")}
                        disabled={salesLoading}
                      >
                        <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
                        Download as CSV
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <EnvFeatureGuard envFeature={EnvFeature.BULK_UPLOAD_SALES}>
                    <FeatureGuard feature={Feature.BULK_UPLOAD_SALES}>
                      {isMobile ? (
                        <Button variant="outline" asChild>
                          <Link href={`${basePath}/sales/bulk-upload`}>
                            <Upload
                              className="h-4 w-4 mr-2"
                              aria-hidden="true"
                            />
                            Bulk Upload
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => setBulkUploadDialog(true)}
                        >
                          <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
                          Bulk Upload
                        </Button>
                      )}
                    </FeatureGuard>
                  </EnvFeatureGuard>
                </>
              )}
            </Can>
            <Can perm="SALES.SALES.CREATE">
              {canManageSales &&
                (isMobile ? (
                  <Button asChild>
                    <Link href={`${basePath}/sales/new`} className="gap-2">
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      New Sale
                    </Link>
                  </Button>
                ) : (
                  <NewSaleForm
                    open={formOpen}
                    onOpenChange={setFormOpen}
                    locations={locations}
                    onSubmit={handleCreateSale}
                    isLoading={createSaleMutation.isPending}
                  />
                ))}
            </Can>
          </div>
        </div>

        <SalesTable
          sales={sales}
          isLoading={salesLoading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleColumnSort}
          onView={handleView}
          currentPage={salesPagination?.currentPage || 1}
          itemsPerPage={salesPagination?.itemsPerPage || DEFAULT_LIMIT}
          selectedSales={selectedSaleIds}
          onSelectionChange={setSelectedSaleIds}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearAllFilters}
        />

        {/* Pagination */}
        {salesPagination && (
          <DataTablePagination
            pagination={salesPagination}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
            isLoading={salesLoading}
          />
        )}

        {/* Sale Detail Dialog */}
        <SaleDetail
          open={!!selectedSaleId}
          onOpenChange={(open) => !open && setSelectedSaleId(null)}
          sale={selectedSale || null}
          isLoading={saleLoading}
        />

        <SaleBulkUploadDialog
          open={bulkUploadDialog}
          onOpenChange={setBulkUploadDialog}
        />

        {/* Sticky bulk action bar when items selected */}
        {selectedSaleIds.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 py-3 px-4 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <span className="text-sm font-medium">
                {selectedSaleIds.size} item
                {selectedSaleIds.size !== 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center gap-2">
                <Can perm="SALES.SALES.EXPORT">
                  {canManageSales && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="sm">
                          <Download
                            className="h-4 w-4 mr-2"
                            aria-hidden="true"
                          />
                          Download
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleExport("excel")}
                          disabled={salesLoading}
                        >
                          <FileSpreadsheet
                            className="h-4 w-4 mr-2"
                            aria-hidden="true"
                          />
                          Download as Excel
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleExport("csv")}
                          disabled={salesLoading}
                        >
                          <FileText
                            className="h-4 w-4 mr-2"
                            aria-hidden="true"
                          />
                          Download as CSV
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </Can>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearSelection}
                  className="shrink-0"
                  aria-label="Clear selection"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
