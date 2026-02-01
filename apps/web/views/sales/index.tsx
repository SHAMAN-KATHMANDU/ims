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
  Filter,
} from "lucide-react";
import { Label } from "@/components/ui/label";
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
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
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
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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

  const today = new Date();
  const applyDateShortcut = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
    setPage(DEFAULT_PAGE);
  };
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
      label: "This month",
      start: startOfMonth(today),
      end: endOfMonth(today),
    },
    {
      label: "6 months",
      start: startOfDay(subMonths(today, 6)),
      end: endOfDay(today),
    },
  ];

  const handleSortChange = useCallback((value: string) => {
    const [by, order] = value.split("-") as [string, "asc" | "desc"];
    setSortBy(by);
    setSortOrder(order);
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

      {/* Action buttons – above filter */}
      <div className="flex flex-wrap items-center justify-end gap-2">
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

      {/* Minimal filter bar – same style as products/discounts */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
        <div className="relative flex-1 min-w-[180px] max-w-[280px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sales..."
            value={search}
            onChange={handleSearchChange}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {dateShortcuts.map(({ label, start, end }) => (
            <Button
              key={label}
              variant="outline"
              size="sm"
              className="h-8 text-xs shrink-0"
              onClick={() => applyDateShortcut(start, end)}
            >
              {label}
            </Button>
          ))}
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
              <p className="text-xs font-medium text-muted-foreground">Type & location</p>
              <div className="grid gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select value={typeFilter} onValueChange={handleTypeChange}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
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
                  <Label className="text-xs">Location</Label>
                  <Select value={locationFilter} onValueChange={handleLocationChange}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All showrooms</SelectItem>
                      {showrooms.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs font-medium text-muted-foreground pt-1">Date range</p>
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
                        {startDate ? format(startDate, "MMM d") : "Pick"}
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
                        {endDate ? format(endDate, "MMM d") : "Pick"}
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
                  className="h-8 text-xs"
                  onClick={clearDateFilters}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Clear dates
                </Button>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Sort</Label>
                <Select
                  value={`${sortBy}-${sortOrder}`}
                  onValueChange={handleSortChange}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt-desc">Newest first</SelectItem>
                    <SelectItem value="createdAt-asc">Oldest first</SelectItem>
                    <SelectItem value="total-desc">Total high–low</SelectItem>
                    <SelectItem value="total-asc">Total low–high</SelectItem>
                    <SelectItem value="saleCode-asc">Sale code A–Z</SelectItem>
                    <SelectItem value="saleCode-desc">Sale code Z–A</SelectItem>
                    <SelectItem value="type-asc">Type A–Z</SelectItem>
                    <SelectItem value="type-desc">Type Z–A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
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
