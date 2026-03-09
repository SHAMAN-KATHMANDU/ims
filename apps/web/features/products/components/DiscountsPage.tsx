"use client";

import { DiscountTypesCard } from "./components/DiscountTypesCard";
import { DiscountsTab } from "./components/DiscountsTab";

export function DiscountsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Discounts</h1>
        <p className="text-muted-foreground mt-2">
          Add discount types (name and % off), then assign them to products.
          View and filter product discounts below.
        </p>
      </div>

      <DiscountTypesCard />
      <DiscountsTab />
    </div>
  );
}
