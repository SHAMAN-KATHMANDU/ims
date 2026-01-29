"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/useToast";
import { useActiveLocations } from "@/hooks/useLocation";
import { useAuthStore, selectIsAdmin } from "@/stores/auth-store";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  CalendarIcon,
  X,
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
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  DataTablePagination,
  type PaginationState,
} from "@/components/ui/data-table-pagination";

const TYPE_OPTIONS: { value: SaleType | "ALL"; label: string }[] = [
  { value: "ALL", label: "All Types" },
  { value: "GENERAL", label: "General" },
  { value: "MEMBER", label: "Member" },
];

export function SalesPage() {
  const { toast } = useToast();
  const isAdmin = useAuthStore(selectIsAdmin);
  const canManageSales = isAdmin;

  // Zustand store for sale selection
  const selectedSaleIds = useSaleSelectionStore(selectSelectedSaleIds);
  const clearSelection = useSaleSelectionStore(selectClearSaleSelection);
  const setSelectedSaleIds = useSaleSelectionStore((state) => state.setSales);

  // Filter state
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<SaleType | "ALL">("ALL");
  const [locationFilter, setLocationFilter] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [bulkUploadDialog, setBulkUploadDialog] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  // Data fetching
  const { data: salesResponse, isLoading: salesLoading } = useSalesPaginated({
    page,
    limit: pageSize,
    search,
    type: typeFilter === "ALL" ? undefined : typeFilter,
    locationId: locationFilter === "ALL" ? undefined : locationFilter,
    startDate: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
    endDate: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
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
      const message =
        error instanceof Error ? error.message : "Failed to create sale";
      toast({
        title: "Error",
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search sales..."
              value={search}
              onChange={handleSearchChange}
              className="pl-9 w-full sm:w-[180px]"
            />
          </div>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Location Filter */}
          <Select value={locationFilter} onValueChange={handleLocationChange}>
            <SelectTrigger className="w-full sm:w-[150px]">
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

          {/* Date Range Filters */}
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal w-[130px]",
                    !startDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "MMM d") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    setStartDate(date);
                    setPage(DEFAULT_PAGE);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal w-[130px]",
                    !endDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "MMM d") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => {
                    setEndDate(date);
                    setPage(DEFAULT_PAGE);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearDateFilters}
                className="h-9 w-9"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

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
        // Selection props
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
