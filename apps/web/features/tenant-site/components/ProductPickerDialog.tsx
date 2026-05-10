"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useProductsPaginated } from "@/features/products";
import type { Product } from "@/features/products";

const PAGE_SIZE = 25;

interface ProductPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialProductIds?: string[];
  onSave: (productIds: string[]) => Promise<void>;
  isSaving?: boolean;
  title?: string;
}

export function ProductPickerDialog({
  open,
  onOpenChange,
  initialProductIds = [],
  onSave,
  isSaving = false,
  title = "Manage Products",
}: ProductPickerDialogProps) {
  const [searchInput, setSearchInput] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(initialProductIds),
  );
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  // Accumulator: pages append into one list so the user can scroll
  // through everything they've loaded so far without losing scroll position
  // when "Load more" fires.
  const [accumulated, setAccumulated] = useState<Product[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      // New search → reset to page 1 + clear accumulator. The next query
      // result will repopulate the list from scratch.
      setPage(1);
      setAccumulated([]);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: productsResult, isLoading: isLoadingProducts } =
    useProductsPaginated({
      search: debouncedSearch,
      page,
      limit: PAGE_SIZE,
    });

  // Append fetched page into the accumulator. Page 1 replaces (covers the
  // search-changed case + the initial mount); higher pages append.
  useEffect(() => {
    if (!productsResult?.data) return;
    setAccumulated((prev) =>
      page === 1
        ? productsResult.data
        : [
            ...prev,
            ...productsResult.data.filter(
              (p) => !prev.some((existing) => existing.id === p.id),
            ),
          ],
    );
  }, [productsResult?.data, page]);

  const products = accumulated;
  const pagination = productsResult?.pagination;
  const hasNextPage = pagination?.hasNextPage ?? false;
  const totalItems = pagination?.totalItems ?? 0;

  const handleToggleProduct = (productId: string) => {
    setSelectedIds((prev) => {
      const updated = new Set(prev);
      if (updated.has(productId)) {
        updated.delete(productId);
      } else {
        updated.add(productId);
      }
      return updated;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === products.length && products.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const handleSave = async () => {
    const productIds = Array.from(selectedIds);
    await onSave(productIds);
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSearchInput("");
      setSelectedIds(new Set(initialProductIds));
      setPage(1);
      setAccumulated([]);
    }
    onOpenChange(newOpen);
  };

  const handleLoadMore = () => {
    if (!isLoadingProducts && hasNextPage) setPage((p) => p + 1);
  };

  const allSelected =
    selectedIds.size > 0 && selectedIds.size === products.length;
  const indeterminate =
    selectedIds.size > 0 && selectedIds.size < products.length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-4" />
            <Input
              placeholder="Search by name or IMS code…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
              disabled={isLoadingProducts}
            />
          </div>

          {/* Product List */}
          <div className="border border-line rounded-lg overflow-hidden bg-bg-elev">
            {/* Header with Select All */}
            <div className="px-4 py-3 bg-bg-sunken border-b border-line flex items-center gap-3">
              <Checkbox
                checked={indeterminate ? "indeterminate" : allSelected}
                onCheckedChange={handleSelectAll}
                disabled={products.length === 0}
              />
              <span className="text-xs font-mono text-ink-4 uppercase tracking-wide">
                Name
              </span>
            </div>

            {/* Empty State */}
            {products.length === 0 && !isLoadingProducts && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-ink-3">
                  No products match your search.
                </p>
              </div>
            )}

            {/* Loading State */}
            {isLoadingProducts && products.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-ink-3">
                Loading products…
              </div>
            )}

            {/* Product Rows */}
            {products.length > 0 && (
              <div>
                {products.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className="w-full text-left px-4 py-3 border-t border-line-2 flex items-center gap-3 hover:bg-bg-sunken transition-colors"
                    onClick={() => handleToggleProduct(product.id)}
                  >
                    <Checkbox
                      checked={selectedIds.has(product.id)}
                      onCheckedChange={() => handleToggleProduct(product.id)}
                      onClick={(e) => e.stopPropagation()}
                      tabIndex={-1}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink">
                        {product.name}
                      </div>
                      <div className="text-xs text-ink-4">
                        {product.imsCode && <>Code: {product.imsCode}</>}
                      </div>
                    </div>
                    <div className="text-sm text-ink-3 flex-shrink-0">
                      ${product.mrp}
                    </div>
                  </button>
                ))}
                {hasNextPage && (
                  <div className="border-t border-line-2 px-4 py-3 flex items-center justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLoadMore}
                      disabled={isLoadingProducts}
                    >
                      {isLoadingProducts
                        ? "Loading…"
                        : `Load more (${products.length} of ${totalItems})`}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Count + total */}
          <div className="text-sm text-ink-4 flex items-center justify-between">
            <span>
              Selected: {selectedIds.size} product
              {selectedIds.size !== 1 ? "s" : ""}
            </span>
            {totalItems > 0 && (
              <span className="text-xs text-ink-4">
                Showing {products.length} of {totalItems}
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
