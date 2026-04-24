"use client";

import React, { useState } from "react";
import { Can } from "@/features/permissions";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit2, Trash2 } from "lucide-react";
import type { Product, ProductVariation } from "@/features/products";
import { formatCurrency } from "@/lib/format";
import {
  getDiscountedPrices,
  getLocationsForVariation,
  getStockAtLocation,
  getStockForVariationAtLocation,
  getTotalStock,
  getVariationAttributeDisplay,
  getVariationTotal,
} from "./utils/helpers";

// ============================================================
// Shared row type
// ============================================================

/** The flattened row shape used by ProductTable's DataTable. */
export type ProductTableRowData = {
  product: Product;
  variation: ProductVariation | null;
};

// ============================================================
// ProductTableRowPrimary
// ============================================================
// Single React.memo component covering all five heavy content
// cells: the four discounted-price columns and the stock column.
//
// How the optimization works:
//   col.cell(row) creates a React element cheaply (just a JS
//   object). React.memo then skips the actual DOM update when
//   the relevant props (product, selectedLocationId) haven't
//   changed — e.g. when only selectedProducts changes.
// ============================================================

type PriceColumn =
  | "normalPrice"
  | "specialPrice"
  | "memberPrice"
  | "wholesalePrice";

type HeavyColumn = PriceColumn | "stock";

const PRICE_KEY: Record<
  PriceColumn,
  "normal" | "special" | "member" | "wholesale"
> = {
  normalPrice: "normal",
  specialPrice: "special",
  memberPrice: "member",
  wholesalePrice: "wholesale",
};

interface ProductTableRowPrimaryProps {
  row: ProductTableRowData;
  column: HeavyColumn;
  selectedLocationId?: string;
}

export const ProductTableRowPrimary = React.memo(
  function ProductTableRowPrimary({
    row,
    column,
    selectedLocationId,
  }: ProductTableRowPrimaryProps) {
    if (column === "stock") {
      const stock = selectedLocationId
        ? getStockAtLocation(row.product, selectedLocationId)
        : getTotalStock(row.product);
      return <span className="font-medium">{stock}</span>;
    }

    const prices = getDiscountedPrices(row.product);
    const price = prices[PRICE_KEY[column]];

    if (!price) {
      return <span className="text-muted-foreground">-</span>;
    }

    return (
      <div>
        <div className="font-medium">{formatCurrency(Number(price.price))}</div>
        <div className="text-xs text-muted-foreground">
          ({price.percentage}% off)
        </div>
      </div>
    );
  },
);

ProductTableRowPrimary.displayName = "ProductTableRowPrimary";

// ============================================================
// ProductDetailSheet
// ============================================================
// Extracted from ProductTable to keep the parent lean.
// Owns its own rowLocationByVariationId state; receives the
// product + config it needs as props.
// ============================================================

interface ProductDetailSheetProps {
  /** The product whose detail is being viewed (null = closed). */
  product: Product | null;
  /** Full product list — used to hydrate the latest product data. */
  products: Product[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLocationId?: string;
  canManageProducts: boolean;
  onEdit: (product: Product) => void;
  onDeleteVariation?: (product: Product, variationId: string) => void;
}

export function ProductDetailSheet({
  product,
  products,
  open,
  onOpenChange,
  selectedLocationId,
  canManageProducts,
  onEdit,
  onDeleteVariation,
}: ProductDetailSheetProps) {
  const [rowLocationByVariationId, setRowLocationByVariationId] = useState<
    Record<string, string>
  >({});

  // Always render the freshest data from the list (optimistic updates).
  const sheetProduct = product
    ? (products.find((p) => p.id === product.id) ?? product)
    : null;

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

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setRowLocationByVariationId({});
        }
        onOpenChange(isOpen);
      }}
    >
      <SheetContent className="flex w-full max-w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
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
                  <div className="overflow-x-auto -mx-1 px-1">
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
                                        e.currentTarget.style.display = "none";
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
                                {getVariationAttributeDisplay(variation) || "—"}
                              </TableCell>
                              {!selectedLocationId && (
                                <TableCell>
                                  {variationLocations.length > 0 ? (
                                    <Select
                                      value={rowLocId || "_none"}
                                      onValueChange={(value) => {
                                        if (value === "_none") return;
                                        setRowLocationByVariationId((prev) => ({
                                          ...prev,
                                          [variation.id]: value,
                                        }));
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
                                        <Can perm="INVENTORY.PRODUCTS.UPDATE">
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
                                                  aria-label={`Edit ${sheetProduct.name}`}
                                                >
                                                  <Edit2
                                                    className="h-4 w-4"
                                                    aria-hidden="true"
                                                  />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                Edit product
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        </Can>
                                      )}
                                      {onDeleteVariation && (
                                        <Can perm="INVENTORY.PRODUCTS.DELETE">
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
                                                  aria-label={`Delete variation ${getVariationAttributeDisplay(variation) || variation.id}`}
                                                >
                                                  <Trash2
                                                    className="h-4 w-4"
                                                    aria-hidden="true"
                                                  />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                Delete variation
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        </Can>
                                      )}
                                    </div>
                                  </TableCell>
                                )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
