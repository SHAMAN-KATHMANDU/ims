"use client";

/**
 * Orchestrates sales list, filters, detail panel, and dialogs; uses hooks for data and mutations.
 * Do not add API calls or business rules here; use hooks and services.
 */

import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/useToast";
import { useActiveLocations } from "@/hooks/useLocation";
import { useAuthStore, selectIsAdmin, selectUserRole } from "@/stores/auth-store";
import {
  useSaleSelectionStore,
  selectSelectedSaleIds,
  selectClearSaleSelection,
} from "@/stores/sale-selection-store";
import { downloadSales } from "@/services/salesService";
import {
  useSalesPaginated,
  useSale,
  useCreateSale,
  type Sale,
  type SaleType,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "@/hooks/useSales";
import { SalesTable } from "./components/SalesTable";
import { NewSaleForm } from "./components/NewSaleForm";
import { SaleDetail } from "./components/SaleDetail";
import { SaleBulkUploadDialog } from "./components/SaleBulkUploadDialog";
import { SalesFilterBar } from "./components/SalesFilterBar";
import { Button } from "@/components/ui/button";
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
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
  const { toast } = useToast();
  const userRole = useAuthStore(selectUserRole);
  const isAdmin = useAuthStore(selectIsAdmin);
  const isUserRole = userRole === "user";
  const canManageSales = isAdmin;

  // For role "user", default date range to today
  useEffect(() => {
    if (isUserRole && startDate === undefined && endDate === undefined) {
      const today = new Date();
      setStartDate(startOfDay(today));
      setEndDate(endOfDay(today));
    }
  }, [isUserRole]); // eslint-disable-line react-hooks/exhaustive-deps -- only set default once when user

  // Zustand store for sale selection
  const selectedSaleIds = useSaleSelectionStore(selectSelectedSaleIds);
  const clearSelection = useSaleSelectionStore(selectClearSaleSelection);
  const setSelectedSaleIds = useSaleSelectionStore((state) => state.setSales);

  // Filter state
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<SaleType | "ALL">("ALL");
  const [creditFilter, setCreditFilter] = useState<
    "ALL" | "credit" | "non-credit"
  >("ALL");
  const [locationFilter, setLocationFilter] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [bulkUploadDialog, setBulkUploadDialog] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  // Data fetching – newest first
  const { data: salesResponse, isLoading: salesLoading } = useSalesPaginated({
    page,
    limit: pageSize,
    search,
    type: typeFilter === "ALL" ? undefined : typeFilter,
    isCreditSale:
      creditFilter === "credit"
        ? true
        : creditFilter === "non-credit"
          ? false
          : undefined,
    locationId: locationFilter === "ALL" ? undefined : locationFilter,
    startDate: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
    endDate: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
    sortBy: "createdAt",
    sortOrder: "desc",
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sales</h1>
        <p className="text-muted-foreground mt-2">
          Track and manage sales from showrooms
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SalesFilterBar
          search={search}
          onSearchChange={handleSearchChange}
          typeFilter={typeFilter}
          onTypeChange={handleTypeChange}
          creditFilter={creditFilter}
          onCreditChange={handleCreditFilterChange}
          locationFilter={locationFilter}
          onLocationChange={handleLocationChange}
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
          showrooms={showrooms}
          dateShortcuts={dateShortcuts}
          onDateShortcut={applyDateShortcut}
          isUserRole={isUserRole}
          today={today}
        />

        <div className="flex items-center gap-2">
          {canManageSales && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
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
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Download as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExport("csv")}
                    disabled={salesLoading}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Download as CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                onClick={() => setBulkUploadDialog(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload
              </Button>
            </>
          )}
          <NewSaleForm
            open={formOpen}
            onOpenChange={setFormOpen}
            locations={locations}
            onSubmit={handleCreateSale}
            isLoading={createSaleMutation.isPending}
          />
        </div>
      </div>

      <SalesTable
        sales={sales}
        isLoading={salesLoading}
        onView={handleView}
        currentPage={salesPagination?.currentPage || 1}
        itemsPerPage={salesPagination?.itemsPerPage || DEFAULT_LIMIT}
        selectedSales={selectedSaleIds}
        onSelectionChange={setSelectedSaleIds}
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
    </div>
  );
}
