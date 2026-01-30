"use client";

import { DiscountsTab } from "./components/DiscountsTab";

export function DiscountsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Discounts</h1>
        <p className="text-muted-foreground mt-2">
          View and manage product discounts with filters, sort, and search
        </p>
      </div>

      <DiscountsTab />
    </div>
  );
}
