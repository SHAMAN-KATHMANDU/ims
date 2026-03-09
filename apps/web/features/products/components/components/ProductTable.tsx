"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Edit2,
  Trash2,
  Loader2,
  X,
  MoreHorizontal,
} from "lucide-react";
import {
  DataTablePagination,
  type PaginationState,
} from "@/components/ui/data-table-pagination";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getDiscountedPrices,
  getCategoryName,
  calculateDiscountedPrice,
  getVariationAttributeDisplay,
  getVariationTotal,
  getStockForVariationAtLocation,
} from "../utils/helpers";
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
  onDelete,
  onDeleteVariation,
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
  const [expandedProductId, setExpandedProductId] = useState<string | null>(
    null,
  );

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

      if (checked) {
        const allIds = new Set(products.map((p) => p.id));
        onSelectionChange(allIds);
      } else {
        onSelectionChange(new Set());
      }
    },
    [products, onSelectionChange],
  );

  // Check if all products on current page are selected
  const allSelected =
    products.length > 0 && products.every((p) => selectedProducts.has(p.id));

  // Calculate column count for empty state and expanded rows
  // Base columns: IMS Code, Variations, Name, Category, (Cost Price if admin), MRP, (4 discount prices if not admin), Stock, Actions = 8 or 11
  // Add 1 for checkbox if selection is enabled
  const baseColumnCount = canSeeCostPrice ? 8 : 11;
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
                placeholder="Search products..."
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
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all products"
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
              <TableHead className="text-right">Actions</TableHead>
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
                const rows: ProductTableRow[] = products.flatMap(
                  (product): ProductTableRow[] => {
                    if (!product.variations?.length) {
                      return [{ product, variation: null }];
                    }
                    return product.variations.map((variation) => ({
                      product,
                      variation,
                    }));
                  },
                );
                const lastRowIndexByProductId = new Map<string, number>();
                rows.forEach((r, i) =>
                  lastRowIndexByProductId.set(r.product.id, i),
                );

                return rows.map(({ product, variation }, rowIndex) => {
                  const discountedPrices = !canSeeCostPrice
                    ? getDiscountedPrices(product)
                    : {};
                  const hasVariations =
                    product.variations && product.variations.length > 0;
                  const isExpanded = expandedProductId === product.id;
                  const productDiscounts = product.discounts || [];
                  const isLastRowForProduct =
                    lastRowIndexByProductId.get(product.id) === rowIndex;
                  const displayStock = variation
                    ? selectedLocationId
                      ? getStockForVariationAtLocation(
                          variation,
                          selectedLocationId,
                        )
                      : getVariationTotal(variation)
                    : 0;

                  return (
                    <React.Fragment
                      key={`${product.id}-${variation ? (variation as { id?: string }).id : "novar"}`}
                    >
                      <TableRow
                        className={
                          hasVariations
                            ? "cursor-pointer hover:bg-muted/50"
                            : ""
                        }
                        onClick={
                          hasVariations
                            ? () => {
                                setExpandedProductId(
                                  isExpanded ? null : product.id,
                                );
                              }
                            : undefined
                        }
                      >
                        {onSelectionChange && (
                          <TableCell
                            onClick={(e) => e.stopPropagation()}
                            className="w-12"
                          >
                            <Checkbox
                              checked={selectedProducts.has(product.id)}
                              onCheckedChange={(checked) =>
                                handleSelectProduct(
                                  product.id,
                                  checked === true,
                                )
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
                          {variation
                            ? getVariationAttributeDisplay(variation)
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
                                    ({discountedPrices.wholesale.percentage}%
                                    off)
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
                        <TableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {canManageProducts ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => onEdit(product)}
                                >
                                  <Edit2 className="mr-2 h-4 w-4" />
                                  Edit Product
                                </DropdownMenuItem>
                                {variation &&
                                  (product.variations?.length ?? 0) > 1 &&
                                  onDeleteVariation && (
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onClick={() =>
                                        onDeleteVariation(
                                          product,
                                          (variation as { id: string }).id,
                                        )
                                      }
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete Variation
                                    </DropdownMenuItem>
                                  )}
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => onDelete(product)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Product
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              View only
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                      {hasVariations && isExpanded && isLastRowForProduct && (
                        <TableRow>
                          <TableCell
                            colSpan={columnCount}
                            className="p-4 bg-muted/30"
                          >
                            <div className="space-y-4">
                              {/* Discounts Section */}
                              {productDiscounts.length > 0 && (
                                <div className="space-y-2">
                                  <div className="text-sm font-semibold">
                                    Available Discounts:
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {productDiscounts
                                      .filter((d) => d.isActive)
                                      .map((discount) => {
                                        const discountPrice =
                                          calculateDiscountedPrice(
                                            product.mrp,
                                            discount.discountPercentage,
                                          );
                                        return (
                                          <div
                                            key={discount.id}
                                            className="border rounded-lg p-2 bg-background"
                                          >
                                            <div className="text-xs font-medium">
                                              {discount.discountType?.name ||
                                                "Unknown"}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              {discount.discountPercentage}% off
                                              -{" "}
                                              {formatCurrency(
                                                Number(discountPrice),
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>
                              )}

                              {/* Variations Section */}
                              <div className="space-y-2">
                                <div className="text-sm font-semibold">
                                  Variations:
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {product.variations?.map((variation) => {
                                    const photos = variation.photos || [];
                                    const primaryPhoto =
                                      photos.find((p) => p.isPrimary) ||
                                      photos[0];
                                    const hasLocationInventory =
                                      variation.locationInventory &&
                                      variation.locationInventory.length > 0;
                                    const totalStock = hasLocationInventory
                                      ? variation.locationInventory!.reduce(
                                          (s, inv) => s + inv.quantity,
                                          0,
                                        )
                                      : (variation.stockQuantity ?? 0);
                                    const subVars =
                                      variation.subVariations ?? [];
                                    const hasSubVariants = subVars.length > 0;

                                    return (
                                      <div
                                        key={variation.id}
                                        className="border rounded-lg p-3 space-y-2"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="space-y-2">
                                            <div className="font-medium text-sm">
                                              {getVariationAttributeDisplay(
                                                variation,
                                              )}
                                            </div>
                                            <div className="text-xs font-medium text-muted-foreground">
                                              Total: {totalStock}
                                            </div>
                                            {!hasSubVariants &&
                                              hasLocationInventory && (
                                                <div className="space-y-1.5">
                                                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                                    By location
                                                  </div>
                                                  <div className="flex flex-wrap gap-2">
                                                    {variation.locationInventory!.map(
                                                      (inv) => (
                                                        <div
                                                          key={inv.location.id}
                                                          className="rounded-md border bg-muted/50 px-2.5 py-1.5 text-xs"
                                                        >
                                                          <span className="font-medium text-foreground">
                                                            {inv.location.name}
                                                          </span>
                                                          <span className="ml-1.5 text-muted-foreground">
                                                            {inv.quantity}
                                                          </span>
                                                        </div>
                                                      ),
                                                    )}
                                                  </div>
                                                </div>
                                              )}
                                            {hasSubVariants && (
                                              <div className="space-y-2">
                                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                                  Sub-variants
                                                </div>
                                                {subVars.map((sub) => {
                                                  const subInvs = (
                                                    variation.locationInventory ??
                                                    []
                                                  ).filter(
                                                    (inv) =>
                                                      inv.subVariationId ===
                                                      sub.id,
                                                  );
                                                  const subTotal =
                                                    subInvs.reduce(
                                                      (s, inv) =>
                                                        s + inv.quantity,
                                                      0,
                                                    );
                                                  return (
                                                    <div
                                                      key={sub.id}
                                                      className="rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs"
                                                    >
                                                      <span className="font-medium text-foreground">
                                                        {sub.name}
                                                      </span>
                                                      <span className="ml-1.5 text-muted-foreground">
                                                        Total: {subTotal}
                                                      </span>
                                                      {subInvs.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                                          {subInvs.map(
                                                            (inv) => (
                                                              <span
                                                                key={
                                                                  inv.location
                                                                    .id
                                                                }
                                                                className="text-muted-foreground"
                                                              >
                                                                {
                                                                  inv.location
                                                                    .name
                                                                }
                                                                : {inv.quantity}
                                                              </span>
                                                            ),
                                                          )}
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        {primaryPhoto && (
                                          <div className="relative">
                                            <Image
                                              src={primaryPhoto.photoUrl}
                                              alt={`${getVariationAttributeDisplay(variation)} variation`}
                                              width={200}
                                              height={128}
                                              className="w-full h-32 object-cover rounded border"
                                              onError={(e) => {
                                                (
                                                  e.target as HTMLImageElement
                                                ).src =
                                                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23ddd' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E";
                                              }}
                                            />
                                            {photos.length > 1 && (
                                              <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                                {photos.length}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                        {photos.length === 0 && (
                                          <div className="w-full h-32 bg-muted rounded border flex items-center justify-center">
                                            <span className="text-xs text-muted-foreground">
                                              No photos
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                });
              })()
            )}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        <DataTablePagination
          pagination={pagination}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          isLoading={isLoading || isFetching}
        />
      </CardContent>
    </Card>
  );
}
