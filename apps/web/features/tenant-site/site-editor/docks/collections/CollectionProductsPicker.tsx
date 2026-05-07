"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useSetCollectionProducts } from "../../../hooks/use-collections";

interface CollectionProductsPickerProps {
  collectionId: string;
  selectedProductIds: string[];
  onChange: (ids: string[]) => void;
}

export function CollectionProductsPicker({
  collectionId,
  selectedProductIds,
  onChange,
}: CollectionProductsPickerProps) {
  const setCollectionProductsMutation = useSetCollectionProducts();
  const [search, setSearch] = useState("");

  // TODO: fetch products list from useProducts hook
  // For now, show empty state with placeholder
  const products = useMemo(() => [], []);

  const handleToggle = (productId: string) => {
    const updated = selectedProductIds.includes(productId)
      ? selectedProductIds.filter((id) => id !== productId)
      : [...selectedProductIds, productId];
    onChange(updated);
  };

  const handleSave = async () => {
    await setCollectionProductsMutation.mutateAsync({
      id: collectionId,
      productIds: selectedProductIds,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Products</Label>
        <span className="text-sm text-gray-600">
          {selectedProductIds.length} selected
        </span>
      </div>

      {products.length > 0 ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="border rounded max-h-64 overflow-y-auto space-y-2 p-2">
            {products.map((product: any) => (
              <div
                key={product.id}
                className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded"
              >
                <Checkbox
                  checked={selectedProductIds.includes(product.id)}
                  onCheckedChange={() => handleToggle(product.id)}
                />
                <span className="text-sm">{product.name}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={handleSave}
            disabled={setCollectionProductsMutation.isPending}
            className="w-full"
            size="sm"
          >
            {setCollectionProductsMutation.isPending
              ? "Saving..."
              : "Save Products"}
          </Button>
        </>
      ) : (
        <div className="border rounded p-4 text-center text-sm text-gray-500">
          No products available. TODO: hook up useProducts query.
        </div>
      )}
    </div>
  );
}
