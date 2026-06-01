"use client";

import { useEffect, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/hooks/useToast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InventoryItem {
  id: string;
  variationId: string;
  subVariationId?: string | null;
  subVariation?: { id: string; name: string };
  quantity: number;
  variation: {
    id: string;
    product: {
      id: string;
      imsCode: string;
      name: string;
    };
    attributes?: Array<{
      attributeType: { name: string };
      attributeValue: { value: string };
    }>;
  };
}

interface PaginatedInventoryResponse {
  data: InventoryItem[];
  pagination?: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface BulkProductSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  /** Products already added (to dedupe in dialog) */
  alreadyAdded: InventoryItem[];
  onAddProducts: (
    items: Array<{ item: InventoryItem; quantity: number }>,
  ) => void;
  isLoading?: boolean;
  getLocationInventory: (
    locationId: string,
    params?: Record<string, unknown>,
  ) => Promise<PaginatedInventoryResponse>;
}

const PAGE_SIZE = 10;

export function BulkProductSelectionDialog({
  open,
  onOpenChange,
  locationId,
  alreadyAdded,
  onAddProducts,
  isLoading,
  getLocationInventory,
}: BulkProductSelectionDialogProps) {
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [selectedMap, setSelectedMap] = useState<Map<string, InventoryItem>>(
    new Map(),
  );

  // Dedupe key: combine variationId and subVariationId
  const getDedupeKey = (item: InventoryItem): string =>
    `${item.variationId}|${item.subVariationId ?? ""}`;

  const alreadyAddedKeys = new Set(alreadyAdded.map(getDedupeKey));

  // Fetch products when search or page changes
  useEffect(() => {
    if (!locationId) return;

    setLoadingProducts(true);
    getLocationInventory(locationId, {
      search: debouncedSearch.trim(),
      limit: PAGE_SIZE,
      page,
    })
      .then((response) => {
        const withStock = response.data.filter((inv) => inv.quantity > 0);
        // De-dupe by variation + sub-variation. The same variation can have
        // more than one location_inventory row (the unique constraint treats a
        // NULL sub_variation_id as distinct), and those rows would otherwise
        // render as identical-looking duplicates. Applies to page 1 too, not
        // just when appending subsequent pages.
        setProducts((prev) => {
          const base = page === 1 ? [] : prev;
          const seen = new Set(base.map(getDedupeKey));
          const merged = [...base];
          for (const item of withStock) {
            const key = getDedupeKey(item);
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(item);
          }
          return merged;
        });
        if (response.pagination) {
          setTotalItems(response.pagination.totalItems);
          setHasNextPage(response.pagination.hasNextPage);
        }
      })
      .catch((err) => {
        if (process.env.NODE_ENV !== "production") {
          console.error(err);
        }
        toast({
          title: "Failed to load products",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        });
      })
      .finally(() => setLoadingProducts(false));
  }, [locationId, debouncedSearch, page, getLocationInventory, toast]);

  const handleToggleProduct = (item: InventoryItem) => {
    const key = getDedupeKey(item);
    setSelectedMap((prev) => {
      const updated = new Map(prev);
      if (updated.has(key)) {
        updated.delete(key);
      } else {
        updated.set(key, item);
      }
      return updated;
    });
  };

  const handleSelectAll = () => {
    const selectableProducts = products.filter(
      (p) => !alreadyAddedKeys.has(getDedupeKey(p)),
    );
    if (
      selectedMap.size === selectableProducts.length &&
      selectableProducts.length > 0
    ) {
      setSelectedMap(new Map());
    } else {
      const newMap = new Map<string, InventoryItem>();
      selectableProducts.forEach((p) => {
        newMap.set(getDedupeKey(p), p);
      });
      setSelectedMap(newMap);
    }
  };

  const handleAdd = () => {
    const itemsToAdd = Array.from(selectedMap.values()).map((item) => ({
      item,
      quantity: 1, // Default to 1 for bulk add
    }));
    if (itemsToAdd.length > 0) {
      onAddProducts(itemsToAdd);
      handleOpenChange(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSearchInput("");
      setPage(1);
      setProducts([]);
      setSelectedMap(new Map());
      setTotalItems(0);
      setHasNextPage(false);
    }
    onOpenChange(newOpen);
  };

  const handleLoadMore = () => {
    if (!loadingProducts && hasNextPage) {
      setPage((p) => p + 1);
    }
  };

  const selectableProducts = products.filter(
    (p) => !alreadyAddedKeys.has(getDedupeKey(p)),
  );
  const allSelected =
    selectedMap.size > 0 && selectedMap.size === selectableProducts.length;
  const indeterminate =
    selectedMap.size > 0 && selectedMap.size < selectableProducts.length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Multiple Products</DialogTitle>
          <DialogDescription>
            Search and select multiple products to add to your transfer. Each
            will be added with a quantity of 1.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by product name, code, or category…"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
                setProducts([]);
              }}
              className="pl-10"
              disabled={loadingProducts}
              aria-label="Search products"
            />
          </div>

          {/* Product List */}
          <div className="border rounded-lg overflow-hidden bg-white">
            {/* Header with Select All */}
            {selectableProducts.length > 0 && (
              <div className="px-4 py-3 bg-muted border-b flex items-center gap-3">
                <Checkbox
                  checked={indeterminate ? "indeterminate" : allSelected}
                  onCheckedChange={handleSelectAll}
                  disabled={selectableProducts.length === 0}
                  aria-label="Select all products"
                />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Product
                </span>
              </div>
            )}

            {/* Empty State */}
            {!searchInput.trim() &&
              !loadingProducts &&
              products.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Search for products by name, product code, or category…
                  </p>
                </div>
              )}

            {/* Loading State */}
            {loadingProducts && products.length === 0 && (
              <div className="px-4 py-8 text-center">
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Loading products…
                </p>
              </div>
            )}

            {/* No Results State */}
            {searchInput.trim() &&
              !loadingProducts &&
              products.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No products found. Try a different search term.
                  </p>
                </div>
              )}

            {/* Product List */}
            {products.length > 0 && (
              <ScrollArea className="h-[400px]">
                <div>
                  {products.map((product) => {
                    const key = getDedupeKey(product);
                    const isAlreadyAdded = alreadyAddedKeys.has(key);
                    const isSelected = selectedMap.has(key);
                    const attrLabel =
                      product.variation.attributes
                        ?.map((a) => a.attributeValue.value)
                        .join(" / ") || "";
                    const variantLabel = [attrLabel, product.subVariation?.name]
                      .filter(Boolean)
                      .join(" / ");

                    return (
                      <button
                        key={key}
                        type="button"
                        className="w-full text-left px-4 py-3 border-t flex items-center gap-3 hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() =>
                          !isAlreadyAdded && handleToggleProduct(product)
                        }
                        disabled={isAlreadyAdded}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() =>
                            !isAlreadyAdded && handleToggleProduct(product)
                          }
                          onClick={(e) => e.stopPropagation()}
                          disabled={isAlreadyAdded}
                          tabIndex={-1}
                          aria-label={`Select ${product.variation.product.name}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">
                            {product.variation.product.name}
                            {variantLabel && (
                              <span className="text-muted-foreground font-normal ml-1.5">
                                — {variantLabel}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono mt-0.5">
                            {product.variation.product.imsCode}
                            {product.subVariation?.name
                              ? ` / ${product.subVariation.name}`
                              : ""}
                          </div>
                        </div>
                        <div className="ml-4 flex items-center gap-4 shrink-0">
                          <div className="text-right text-xs text-muted-foreground">
                            Stock: {product.quantity}
                            {isAlreadyAdded && (
                              <div className="text-xs font-medium text-muted-foreground mt-0.5">
                                Already added
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {hasNextPage && (
                    <div className="border-t px-4 py-3 flex items-center justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLoadMore}
                        disabled={loadingProducts}
                      >
                        {loadingProducts
                          ? "Loading…"
                          : `Load more (${products.length} of ${totalItems})`}
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Selected Count */}
          <div className="text-sm text-muted-foreground flex items-center justify-between">
            <span>
              Selected: {selectedMap.size} product
              {selectedMap.size !== 1 ? "s" : ""}
            </span>
            {totalItems > 0 && (
              <span className="text-xs text-muted-foreground">
                Showing {products.length} of {totalItems}
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={isLoading || selectedMap.size === 0}
          >
            {isLoading
              ? "Adding…"
              : `Add ${selectedMap.size} Product${selectedMap.size !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
