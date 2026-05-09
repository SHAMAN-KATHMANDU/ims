"use client";

import { useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { Search, X, Link2 } from "lucide-react";
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
import { routes } from "@/constants/routes";

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
  const [debouncedSearch] = useDebounce(searchInput.trim(), 300);

  const { data: productsResult, isLoading: isLoadingProducts } =
    useProductsPaginated({
      search: debouncedSearch,
      page: 1,
      limit: 50,
    });

  const products = useMemo(
    () => productsResult?.data ?? [],
    [productsResult?.data],
  );

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
    }
    onOpenChange(newOpen);
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
                checked={allSelected}
                ref={(ref) => {
                  if (ref && indeterminate) {
                    ref.indeterminate = true;
                  }
                }}
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
                <p className="text-sm text-ink-3 mb-4">
                  No products found in your catalog.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="inline-flex gap-2"
                >
                  <a href={routes.products}>
                    <Link2 className="w-4 h-4" />
                    Browse products
                  </a>
                </Button>
              </div>
            )}

            {/* Loading State */}
            {isLoadingProducts && (
              <div className="px-4 py-8 text-center text-sm text-ink-3">
                Loading products…
              </div>
            )}

            {/* Product Rows */}
            {products.length > 0 && (
              <div>
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="px-4 py-3 border-t border-line-2 flex items-center gap-3 hover:bg-bg-sunken transition-colors cursor-pointer"
                    onClick={() => handleToggleProduct(product.id)}
                  >
                    <Checkbox
                      checked={selectedIds.has(product.id)}
                      onCheckedChange={() => handleToggleProduct(product.id)}
                      onClick={(e) => e.stopPropagation()}
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
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Count */}
          <div className="text-sm text-ink-4">
            Selected: {selectedIds.size} product
            {selectedIds.size !== 1 ? "s" : ""}
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
