/**
 * Product picker shown above the canvas when scope === "product-detail".
 *
 * The tenant-site preview route hydrates the PDP with whatever product id
 * the editor passes as `pageId`. Without this picker, a product-detail
 * preview falls through to whatever default the API picks (usually the
 * first product) — fine for layout work, useless when the user wants to
 * verify how the page looks for a specific SKU.
 */

"use client";

import { useEffect, useMemo } from "react";
import { ChevronDown, Package } from "lucide-react";
import { useProductsPaginated, type Product } from "@/features/products";

interface PdpProductPickerProps {
  productId: string | null;
  onProductIdChange: (id: string | null) => void;
}

export function PdpProductPicker({
  productId,
  onProductIdChange,
}: PdpProductPickerProps) {
  const productsQuery = useProductsPaginated({ limit: 50 });
  const products: Product[] = useMemo(
    () => productsQuery.data?.data ?? [],
    [productsQuery.data],
  );

  // Default to the first product so the preview hydrates immediately on
  // first scope switch. Clears the selection if the active product is
  // gone (e.g. it was deleted in another tab and the list refetched).
  useEffect(() => {
    if (productsQuery.isLoading) return;
    if (!productId && products.length > 0 && products[0]) {
      onProductIdChange(products[0].id);
      return;
    }
    if (productId && !products.some((p: Product) => p.id === productId)) {
      onProductIdChange(products[0]?.id ?? null);
    }
  }, [products, productId, productsQuery.isLoading, onProductIdChange]);

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200">
      <Package className="w-4 h-4 text-gray-500" aria-hidden="true" />
      <label
        htmlFor="pdp-product-picker"
        className="text-xs text-gray-600 font-medium"
      >
        Previewing product:
      </label>
      <div className="relative">
        <select
          id="pdp-product-picker"
          value={productId ?? ""}
          onChange={(e) => onProductIdChange(e.target.value || null)}
          disabled={productsQuery.isLoading || products.length === 0}
          className="appearance-none pr-7 pl-2 py-1 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
        >
          {productsQuery.isLoading && <option>Loading…</option>}
          {!productsQuery.isLoading && products.length === 0 && (
            <option>No products yet</option>
          )}
          {products.map((p: Product) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
      </div>
      {productsQuery.data?.pagination &&
        products.length < productsQuery.data.pagination.totalItems && (
          <span className="text-[10px] text-gray-400">
            ({products.length} of {productsQuery.data.pagination.totalItems})
          </span>
        )}
    </div>
  );
}
