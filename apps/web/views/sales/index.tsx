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
import { Label } from "@/components/ui/label";
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
  Filter,
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

  // Data fetching – newest first
  const { data: salesResponse, isLoading: salesLoading } = useSalesPaginated({
    page,
    limit: pageSize,
    search,
    type: typeFilter === "ALL" ? undefined : typeFilter,
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
  const dateShortcuts = [
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

  const applyDateShortcut = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
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
        {/* Minimal filter bar – search + Filters popover (like Catalog) */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search sales..."
              value={search}
              onChange={handleSearchChange}
              className="pl-8 h-9 text-sm w-full min-w-[180px] max-w-[240px]"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 text-sm shrink-0"
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="end">
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Type & showroom
                </p>
                <div className="grid gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select value={typeFilter} onValueChange={handleTypeChange}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Showroom</Label>
                    <Select
                      value={locationFilter}
                      onValueChange={handleLocationChange}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Showroom" />
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
                  </div>
                </div>
                <p className="text-xs font-medium text-muted-foreground pt-1">
                  Date range
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {dateShortcuts.map(({ label, start, end }) => (
                    <Button
                      key={label}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => applyDateShortcut(start, end)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">From</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-8 w-full justify-start text-left font-normal text-sm",
                            !startDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                          {startDate ? format(startDate, "MMM d") : "Select"}
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
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">To</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-8 w-full justify-start text-left font-normal text-sm",
                            !endDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                          {endDate ? format(endDate, "MMM d") : "Select"}
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
                  </div>
                </div>
                {(startDate || endDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full text-xs"
                    onClick={clearDateFilters}
                  >
                    <X className="h-3.5 w-3.5 mr-2" />
                    Clear dates
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
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
