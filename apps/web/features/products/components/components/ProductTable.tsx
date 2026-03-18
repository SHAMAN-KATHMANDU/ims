"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
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
  SortableTableHead,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Edit2, Trash2, Loader2, X } from "lucide-react";
import {
  DataTablePagination,
  type PaginationState,
} from "@/components/ui/data-table-pagination";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getDiscountedPrices,
  getCategoryName,
  getVariationAttributeDisplay,
  getVariationTotal,
  getStockForVariationAtLocation,
  getTotalStock,
  getStockAtLocation,
  getLocationsForVariation,
} from "../utils/helpers";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Product, ProductVariation, Category } from "@/features/products";
import { formatCurrency } from "@/lib/format";

/** One table row: either one variation of a product, or the product with no variations */
type ProductTableRow = {
  product: Product;
  variation: ProductVariation | null;
};

// ============================================
// Types
// ============================================

interface ProductTableProps {
  products: Product[];
  categories: Category[];
  canSeeCostPrice: boolean;
  canManageProducts: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (sortBy: string, sortOrder: "asc" | "desc") => void;
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
// Loading Skeleton Component
// ============================================

function ProductTableSkeleton({
  rows = 5,
  columns = 7,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
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
  /** When location filter is "All", each variation row can pick a location from its own inventory */
  const [rowLocationByVariationId, setRowLocationByVariationId] = useState<
    Record<string, string>
  >({});

  // Keep sheetProduct in sync with latest products prop data (which has locationInventory)
  const sheetProduct = productForDetail
    ? (products.find((p) => p.id === productForDetail.id) ?? productForDetail)
    : null;

  // Resolve the selected location name from the product's own locationInventory data
  const selectedLocationName = selectedLocationId
    ? (() => {
        for (const v of sheetProduct?.variations ?? []) {
          const inv = v.locationInventory?.find(
            (i) => i.location?.id === selectedLocationId,
          );
          if (inv?.location?.name) return inv.location.name;
        }
        return undefined;
      })()
    : undefined;

  // Use debounced search hook for server-side search
  const { localSearch, handleSearchChange, clearSearch } = useDebouncedSearch(
    searchQuery,
    onSearchChange,
  );

  // Selection handlers
  const handleSelectProduct = useCallback(
    (productId: string, checked: boolean) => {
      if (!onSelectionChange) return;

      const newSelection = new Set(selectedProducts);
      if (checked) {
        newSelection.add(productId);
      } else {
        newSelection.delete(productId);
      }
      onSelectionChange(newSelection);
    },
    [selectedProducts, onSelectionChange],
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (!onSelectionChange) return;

      const currentPageIds = new Set(products.map((p) => p.id));
      const newSelection = new Set(selectedProducts);

      if (checked) {
        currentPageIds.forEach((id) => newSelection.add(id));
      } else {
        currentPageIds.forEach((id) => newSelection.delete(id));
      }
      onSelectionChange(newSelection);
    },
    [products, selectedProducts, onSelectionChange],
  );

  // Header checkbox: all selected (checked), some selected (indeterminate), none (unchecked)
  const currentPageSelectedCount = products.filter((p) =>
    selectedProducts.has(p.id),
  ).length;
  const allSelected =
    products.length > 0 && currentPageSelectedCount === products.length;
  const someSelected =
    products.length > 0 &&
    currentPageSelectedCount > 0 &&
    currentPageSelectedCount < products.length;
  const headerChecked = allSelected
    ? true
    : someSelected
      ? "indeterminate"
      : false;

  // Calculate column count for empty state and expanded rows
  // Base columns: IMS Code, Name, Variations, Category, (Cost Price if admin), MRP, (4 discount prices if not admin), Stock = 7 or 10
  // Add 1 for checkbox if selection is enabled
  const baseColumnCount = canSeeCostPrice ? 7 : 10;
  const columnCount = onSelectionChange ? baseColumnCount + 1 : baseColumnCount;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              All Products
              {isFetching && !isLoading && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </CardTitle>
            <CardDescription>
              {localSearch
                ? `Found ${pagination.totalItems} products matching "${localSearch}"`
                : `Total: ${pagination.totalItems} products`}
            </CardDescription>
          </div>
          <div className="flex flex-nowrap items-center gap-2 w-full sm:w-auto">
            {/* Filter button/controls – always visible alongside search */}
            {filterBar != null ? (
              <div className="flex shrink-0 items-center gap-2">
                {filterBar}
              </div>
            ) : null}
            <div className="relative flex-1 min-w-[140px] max-w-[280px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
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
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {onSelectionChange && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={headerChecked}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all products on this page"
                  />
                </TableHead>
              )}
              <TableHead>IMS Code</TableHead>
              {canSort ? (
                <SortableTableHead
                  sortKey="name"
                  currentSortBy={sortBy}
                  currentSortOrder={sortOrder}
                  onSort={onSort!}
                >
                  Product Name
                </SortableTableHead>
              ) : (
                <TableHead>Product Name</TableHead>
              )}
              <TableHead>Variations</TableHead>
              <TableHead>Category</TableHead>
              {canSeeCostPrice && <TableHead>Cost Price</TableHead>}
              <TableHead>MRP</TableHead>
              {!canSeeCostPrice && (
                <>
                  <TableHead>Normal Price</TableHead>
                  <TableHead>Special Price</TableHead>
                  <TableHead>Member Price</TableHead>
                  <TableHead>Wholesale Price</TableHead>
                </>
              )}
              <TableHead>Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <ProductTableSkeleton
                rows={pagination.itemsPerPage}
                columns={columnCount}
              />
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className="text-center text-muted-foreground py-8"
                >
                  {localSearch
                    ? "No products found matching your search."
                    : "No products found."}
                </TableCell>
              </TableRow>
            ) : (
              (() => {
                const rows: ProductTableRow[] = products.map((product) => ({
                  product,
                  variation: null,
                }));

                return rows.map(({ product }) => {
                  const discountedPrices = !canSeeCostPrice
                    ? getDiscountedPrices(product)
                    : {};
                  const _hasVariations =
                    product.variations && product.variations.length > 0;
                  const displayStock = selectedLocationId
                    ? getStockAtLocation(product, selectedLocationId)
                    : getTotalStock(product);
                  const variationCount = product.variations?.length ?? 0;

                  return (
                    <TableRow
                      key={product.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setProductForDetail(product)}
                    >
                      {onSelectionChange && (
                        <TableCell
                          onClick={(e) => e.stopPropagation()}
                          className="w-12"
                        >
                          <Checkbox
                            checked={selectedProducts.has(product.id)}
                            onCheckedChange={(checked) =>
                              handleSelectProduct(product.id, checked === true)
                            }
                            aria-label={`Select ${product.name}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-mono">
                        {(product as { imsCode?: string }).imsCode ?? "—"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {product.name}
                      </TableCell>
                      <TableCell>
                        {variationCount > 0
                          ? `${variationCount} variation(s)`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {getCategoryName(
                          product.categoryId,
                          product,
                          categories,
                        )}
                      </TableCell>
                      {canSeeCostPrice && (
                        <TableCell>
                          {formatCurrency(Number(product.costPrice))}
                        </TableCell>
                      )}
                      <TableCell>
                        {formatCurrency(Number(product.mrp))}
                      </TableCell>
                      {!canSeeCostPrice && (
                        <>
                          <TableCell>
                            {discountedPrices.normal ? (
                              <div>
                                <div className="font-medium">
                                  {formatCurrency(
                                    Number(discountedPrices.normal.price),
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ({discountedPrices.normal.percentage}% off)
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {discountedPrices.special ? (
                              <div>
                                <div className="font-medium">
                                  {formatCurrency(
                                    Number(discountedPrices.special.price),
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ({discountedPrices.special.percentage}% off)
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {discountedPrices.member ? (
                              <div>
                                <div className="font-medium">
                                  {formatCurrency(
                                    Number(discountedPrices.member.price),
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ({discountedPrices.member.percentage}% off)
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {discountedPrices.wholesale ? (
                              <div>
                                <div className="font-medium">
                                  {formatCurrency(
                                    Number(discountedPrices.wholesale.price),
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ({discountedPrices.wholesale.percentage}% off)
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        <span className="font-medium">{displayStock}</span>
                      </TableCell>
                    </TableRow>
                  );
                });
              })()
            )}
          </TableBody>
        </Table>

        {/* Product detail sheet */}
        <Sheet
          open={!!productForDetail}
          onOpenChange={(open) => {
            if (!open) {
              setProductForDetail(null);
              setRowLocationByVariationId({});
            }
          }}
        >
          <SheetContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
            {sheetProduct && (
              <>
                <div className="shrink-0 border-b bg-muted/20 px-5 pt-4 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {(sheetProduct as { imsCode?: string }).imsCode && (
                      <span className="rounded-md border bg-background px-2 py-0.5 font-mono text-xs">
                        {(sheetProduct as { imsCode?: string }).imsCode}
                      </span>
                    )}
                    {selectedLocationId && selectedLocationName && (
                      <span className="rounded-md border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                        {selectedLocationName}
                      </span>
                    )}
                  </div>
                  <SheetHeader className="mt-2 space-y-0">
                    <SheetTitle className="text-left text-lg">
                      {sheetProduct.name}
                    </SheetTitle>
                  </SheetHeader>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                  <div className="space-y-4">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Variations
                    </h3>
                    {!sheetProduct.variations?.length ? (
                      <p className="text-sm text-muted-foreground">
                        No variations.
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[56px]">Photo</TableHead>
                            <TableHead>Variation</TableHead>
                            {!selectedLocationId && (
                              <TableHead>Location</TableHead>
                            )}
                            <TableHead className="text-right">Stock</TableHead>
                            {canManageProducts &&
                              (onEdit || onDeleteVariation) && (
                                <TableHead className="w-[100px] text-right">
                                  Actions
                                </TableHead>
                              )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sheetProduct.variations.map((variation) => {
                            const variationLocations =
                              getLocationsForVariation(variation);
                            const rowLocId =
                              rowLocationByVariationId[variation.id] ??
                              variationLocations[0]?.id ??
                              "";

                            const stock = selectedLocationId
                              ? getStockForVariationAtLocation(
                                  variation,
                                  selectedLocationId,
                                )
                              : rowLocId
                                ? getStockForVariationAtLocation(
                                    variation,
                                    rowLocId,
                                  )
                                : getVariationTotal(variation);

                            const variationPhotos =
                              (
                                variation as {
                                  photos?: Array<{
                                    photoUrl: string;
                                    isPrimary?: boolean;
                                  }>;
                                }
                              ).photos ?? [];
                            const primaryPhoto =
                              variationPhotos.find((p) => p.isPrimary) ??
                              variationPhotos[0];

                            return (
                              <TableRow key={variation.id}>
                                <TableCell className="w-[56px] p-1 align-middle">
                                  {primaryPhoto?.photoUrl ? (
                                    <div className="relative h-12 w-12 rounded border overflow-hidden shrink-0 bg-muted">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={primaryPhoto.photoUrl}
                                        alt=""
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                          e.currentTarget.style.display =
                                            "none";
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">
                                      —
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {getVariationAttributeDisplay(variation) ||
                                    "—"}
                                </TableCell>
                                {!selectedLocationId && (
                                  <TableCell>
                                    {variationLocations.length > 0 ? (
                                      <Select
                                        value={rowLocId || "_none"}
                                        onValueChange={(value) => {
                                          if (value === "_none") return;
                                          setRowLocationByVariationId(
                                            (prev) => ({
                                              ...prev,
                                              [variation.id]: value,
                                            }),
                                          );
                                        }}
                                      >
                                        <SelectTrigger className="h-8 text-sm w-[140px]">
                                          <SelectValue placeholder="Location" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {variationLocations.map((loc) => (
                                            <SelectItem
                                              key={loc.id}
                                              value={loc.id}
                                            >
                                              {loc.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <span className="text-sm text-muted-foreground">
                                        —
                                      </span>
                                    )}
                                  </TableCell>
                                )}
                                <TableCell className="text-right">
                                  {stock}
                                </TableCell>
                                {canManageProducts &&
                                  (onEdit || onDeleteVariation) && (
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        {onEdit && (
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-8 w-8"
                                                  onClick={() =>
                                                    onEdit(sheetProduct)
                                                  }
                                                  aria-label="Edit product"
                                                >
                                                  <Edit2 className="h-4 w-4" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                Edit product
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        )}
                                        {onDeleteVariation && (
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                                  onClick={() =>
                                                    onDeleteVariation(
                                                      sheetProduct,
                                                      variation.id,
                                                    )
                                                  }
                                                  aria-label="Delete variation"
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                Delete variation
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        )}
                                      </div>
                                    </TableCell>
                                  )}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* Pagination Controls */}
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
