"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, X } from "lucide-react";
import {
  DataTablePagination,
  type PaginationState,
} from "@/components/ui/data-table-pagination";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { type SortOrder } from "@/components/ui/table";
import {
  getCategoryName,
  getDiscountedPrices,
  getStockAtLocation,
  getTotalStock,
} from "./utils/helpers";
import type { Product, Category } from "@/features/products";
import { formatCurrency } from "@/lib/format";
import { Checkbox } from "@/components/ui/checkbox";
import { ProductTableRowPrimary, ProductDetailSheet } from "./ProductTableRow";
import type { ProductTableRowData as ProductTableRow } from "./ProductTableRow";

// ============================================
// Types
// ============================================

interface ProductTableProps {
  products: Product[];
  categories: Category[];
  canSeeCostPrice: boolean;
  canManageProducts: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc" | "none";
  onSort?: (sortBy: string, sortOrder: "asc" | "desc" | "none") => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onDeleteVariation?: (product: Product, variationId: string) => void;
  /** When provided and !canManageProducts, shows clickable eye icon for product detail view */
  onView?: (product: Product) => void;
  // Pagination props (required for server-side pagination)
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  // Search props (required for server-side search)
  searchQuery: string;
  onSearchChange: (search: string) => void;
  // Optional filter bar rendered inside the table card (Location, Filters popover, etc.)
  filterBar?: React.ReactNode;
  /** When set, Stock column shows stock at this location only (actual count at location). Otherwise shows total stock. */
  selectedLocationId?: string;
  // Loading state
  isLoading?: boolean;
  isFetching?: boolean;
  // Selection props
  selectedProducts?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

// ============================================
// Constants
// ============================================

const SEARCH_DEBOUNCE_MS = 400;

// ============================================
// Custom Hook for Debounced Search
// ============================================

function useDebouncedSearch(
  externalValue: string,
  onSearchChange: (value: string) => void,
  delay: number = SEARCH_DEBOUNCE_MS,
) {
  const [localSearch, setLocalSearch] = useState(externalValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state with external value when it changes (e.g., when cleared externally)
  useEffect(() => {
    setLocalSearch(externalValue);
  }, [externalValue]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        onSearchChange(value);
      }, delay);
    },
    [onSearchChange, delay],
  );

  const clearSearch = useCallback(() => {
    setLocalSearch("");
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onSearchChange("");
  }, [onSearchChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { localSearch, handleSearchChange, clearSearch };
}

// ============================================
// Main Component
// ============================================

export function ProductTable({
  products,
  categories,
  canSeeCostPrice,
  canManageProducts,
  sortBy,
  sortOrder,
  onSort,
  onEdit,
  onDelete: _onDelete,
  onDeleteVariation,
  onView: _onView,
  pagination,
  onPageChange,
  onPageSizeChange,
  searchQuery,
  onSearchChange,
  filterBar,
  selectedLocationId,
  isLoading = false,
  isFetching = false,
  selectedProducts = new Set(),
  onSelectionChange,
}: ProductTableProps) {
  const canSort = Boolean(onSort);
  const [productForDetail, setProductForDetail] = useState<Product | null>(
    null,
  );

  const { localSearch, handleSearchChange, clearSearch } = useDebouncedSearch(
    searchQuery,
    onSearchChange,
  );

  // ── Stable callbacks ─────────────────────────────────────────────────────
  const getRowKey = useCallback(
    (row: ProductTableRow) =>
      row.variation ? row.variation.id : `${row.product.id}-no-var`,
    [],
  );

  const getRowId = useCallback((row: ProductTableRow) => row.product.id, []);

  const handleRowClick = useCallback((row: ProductTableRow) => {
    setProductForDetail(row.product);
  }, []);

  const handleDetailSheetOpenChange = useCallback((open: boolean) => {
    if (!open) setProductForDetail(null);
  }, []);

  // ── Flattened rows ────────────────────────────────────────────────────────
  const flattenedRows: ProductTableRow[] = useMemo(() => {
    const rows: ProductTableRow[] = [];
    for (const product of products) {
      if (product.variations && product.variations.length > 0) {
        for (const variation of product.variations) {
          rows.push({ product, variation });
        }
      } else {
        rows.push({ product, variation: null });
      }
    }
    return rows;
  }, [products]);

  // ── Columns ───────────────────────────────────────────────────────────────
  // Heavy cell content (discount prices, stock) is delegated to
  // ProductTableRowPrimary (React.memo). The cell() call itself is cheap;
  // React.memo skips re-rendering the component when product is stable.
  const columns: DataTableColumn<ProductTableRow>[] = useMemo(() => {
    const baseColumns: DataTableColumn<ProductTableRow>[] = [
      {
        id: "imsCode",
        header: "Product Code",
        sortKey: canSort ? "imsCode" : undefined,
        cell: (row) => (row.product as { imsCode?: string }).imsCode ?? "—",
        cellClassName: "font-mono",
      },
      {
        id: "name",
        header: "Product Name",
        sortKey: canSort ? "name" : undefined,
        cell: (row) => row.product.name,
        cellClassName: "font-medium",
      },
      {
        id: "variations",
        header: "Variations",
        cell: (row) => {
          const count = row.product.variations?.length ?? 0;
          return count > 0 ? `${count} variation(s)` : "—";
        },
      },
      {
        id: "category",
        header: "Category",
        cell: (row) =>
          getCategoryName(row.product.categoryId, row.product, categories),
      },
    ];

    const costPriceColumns: DataTableColumn<ProductTableRow>[] = canSeeCostPrice
      ? [
          {
            id: "costPrice",
            header: "Cost Price",
            sortKey: canSort ? "costPrice" : undefined,
            cell: (row) => formatCurrency(Number(row.product.costPrice)),
            cellClassName: "text-right",
          },
        ]
      : [];

    const priceColumns: DataTableColumn<ProductTableRow>[] = [
      {
        id: "mrp",
        header: "MRP",
        sortKey: canSort ? "mrp" : undefined,
        cell: (row) => formatCurrency(Number(row.product.mrp)),
        cellClassName: "text-right",
      },
    ];

    const discountColumns: DataTableColumn<ProductTableRow>[] = !canSeeCostPrice
      ? [
          {
            id: "normalPrice",
            header: "Normal Price",
            cell: (row) => (
              <ProductTableRowPrimary row={row} column="normalPrice" />
            ),
            cellClassName: "text-right",
          },
          {
            id: "specialPrice",
            header: "Special Price",
            cell: (row) => (
              <ProductTableRowPrimary row={row} column="specialPrice" />
            ),
            cellClassName: "text-right",
          },
          {
            id: "memberPrice",
            header: "Member Price",
            cell: (row) => (
              <ProductTableRowPrimary row={row} column="memberPrice" />
            ),
            cellClassName: "text-right",
          },
          {
            id: "wholesalePrice",
            header: "Wholesale Price",
            cell: (row) => (
              <ProductTableRowPrimary row={row} column="wholesalePrice" />
            ),
            cellClassName: "text-right",
          },
        ]
      : [];

    const stockColumn: DataTableColumn<ProductTableRow>[] = [
      {
        id: "stock",
        header: "Stock",
        sortKey: canSort ? "totalStock" : undefined,
        cell: (row) => (
          <ProductTableRowPrimary
            row={row}
            column="stock"
            selectedLocationId={selectedLocationId}
          />
        ),
        cellClassName: "text-right",
      },
    ];

    return [
      ...baseColumns,
      ...costPriceColumns,
      ...priceColumns,
      ...discountColumns,
      ...stockColumn,
    ];
  }, [canSort, canSeeCostPrice, categories, selectedLocationId]);

  // ── Mobile card renderer ──────────────────────────────────────────────────
  const renderMobileCard = useCallback(
    (row: ProductTableRow) => {
      const discountedPrices = !canSeeCostPrice
        ? getDiscountedPrices(row.product)
        : {};
      const displayStock = selectedLocationId
        ? getStockAtLocation(row.product, selectedLocationId)
        : getTotalStock(row.product);
      const variationCount = row.product.variations?.length ?? 0;
      const imsCode = (row.product as { imsCode?: string }).imsCode ?? "—";

      return (
        <div
          role="button"
          tabIndex={0}
          className="w-full rounded-lg border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/40 active:bg-muted/60 cursor-pointer"
          onClick={() => setProductForDetail(row.product)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setProductForDetail(row.product);
            }
          }}
        >
          <div className="flex gap-3">
            {onSelectionChange && (
              <div
                role="presentation"
                className="shrink-0 pt-0.5"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={selectedProducts.has(row.product.id)}
                  onCheckedChange={(checked) =>
                    onSelectionChange &&
                    (() => {
                      const newSelection = new Set(selectedProducts);
                      if (checked) {
                        newSelection.add(row.product.id);
                      } else {
                        newSelection.delete(row.product.id);
                      }
                      onSelectionChange(newSelection);
                    })()
                  }
                  aria-label={`Select ${row.product.name}`}
                />
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold leading-snug line-clamp-2">
                  {row.product.name}
                </p>
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                {imsCode}
              </p>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {getCategoryName(
                  row.product.categoryId,
                  row.product,
                  categories,
                )}
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">MRP</p>
                  <p className="font-medium tabular-nums">
                    {formatCurrency(Number(row.product.mrp))}
                  </p>
                </div>
                {canSeeCostPrice && (
                  <div>
                    <p className="text-xs text-muted-foreground">Cost</p>
                    <p className="font-medium tabular-nums">
                      {formatCurrency(Number(row.product.costPrice))}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Stock</p>
                  <p className="font-medium tabular-nums">{displayStock}</p>
                </div>
              </div>
              {!canSeeCostPrice && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {[
                    discountedPrices.normal &&
                      `Normal ${formatCurrency(Number(discountedPrices.normal.price))}`,
                    discountedPrices.special &&
                      `Special ${formatCurrency(Number(discountedPrices.special.price))}`,
                    discountedPrices.member &&
                      `Member ${formatCurrency(Number(discountedPrices.member.price))}`,
                    discountedPrices.wholesale &&
                      `Wholesale ${formatCurrency(Number(discountedPrices.wholesale.price))}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {variationCount > 0
                  ? `${variationCount} variation${variationCount === 1 ? "" : "s"}`
                  : "No variations"}
              </p>
            </div>
          </div>
        </div>
      );
    },
    [
      canSeeCostPrice,
      selectedLocationId,
      categories,
      onSelectionChange,
      selectedProducts,
    ],
  );

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
              All Products
              {isFetching && !isLoading && (
                <Loader2
                  className="h-4 w-4 animate-spin text-muted-foreground"
                  aria-label="Refreshing"
                />
              )}
            </CardTitle>
            <CardDescription>
              {localSearch
                ? `Found ${pagination.totalItems} products matching "${localSearch}"`
                : `Total: ${pagination.totalItems} products`}
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto md:max-w-none md:flex-row md:flex-nowrap md:items-center">
            {filterBar != null ? (
              <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:shrink-0">
                {filterBar}
              </div>
            ) : null}
            <div className="relative w-full min-w-0 md:max-w-[280px] md:flex-1">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                aria-hidden="true"
              />
              <Input
                type="search"
                aria-label="Search products by name"
                placeholder="Search product name"
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 pr-9"
              />
              {localSearch && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-0">
        <DataTable<ProductTableRow>
          data={flattenedRows}
          columns={columns}
          getRowKey={getRowKey}
          isLoading={isLoading}
          skeletonRows={pagination.itemsPerPage}
          sort={
            onSort
              ? {
                  sortBy: sortBy ?? "",
                  sortOrder: (sortOrder ?? "none") as SortOrder,
                  onSort,
                }
              : undefined
          }
          selection={
            onSelectionChange
              ? {
                  selectedIds: selectedProducts,
                  onChange: onSelectionChange,
                  getRowId,
                }
              : undefined
          }
          emptyState={{
            title: localSearch
              ? "No products match your search"
              : "No products yet",
            description: localSearch
              ? "Try a different search term."
              : undefined,
            action: localSearch ? (
              <Button variant="outline" size="sm" onClick={clearSearch}>
                Clear search
              </Button>
            ) : undefined,
          }}
          renderMobileCard={renderMobileCard}
          mobileBreakpoint="md"
          onRowClick={handleRowClick}
          rowClassName="cursor-pointer hover:bg-muted/50"
        />

        <ProductDetailSheet
          product={productForDetail}
          products={products}
          open={!!productForDetail}
          onOpenChange={handleDetailSheetOpenChange}
          selectedLocationId={selectedLocationId}
          canManageProducts={canManageProducts}
          onEdit={onEdit}
          onDeleteVariation={onDeleteVariation}
        />

        <DataTablePagination
          pagination={pagination}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          isLoading={isLoading || isFetching}
          itemLabel="products"
        />
      </CardContent>
    </Card>
  );
}
