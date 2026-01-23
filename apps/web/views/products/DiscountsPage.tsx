"use client";

import { useProducts } from "@/hooks/useProduct";
import { DiscountsTab } from "./components/DiscountsTab";

export function DiscountsPage() {
  const { data: allProducts = [] } = useProducts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Discounts</h1>
        <p className="text-muted-foreground mt-2">
          View and manage product discounts
        </p>
      </div>

      <DiscountsTab products={allProducts} />
    </div>
  );
}
