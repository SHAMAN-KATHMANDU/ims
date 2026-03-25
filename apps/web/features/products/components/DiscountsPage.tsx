"use client";

import { DiscountTypesCard } from "./components/DiscountTypesCard";
import { DiscountsTab } from "./components/DiscountsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function DiscountsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Discounts</h1>
        <p className="text-muted-foreground mt-2">
          Manage product discounts and discount types for your catalog.
        </p>
      </div>

      <Tabs defaultValue="product-discounts" className="w-full gap-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="product-discounts">Product discounts</TabsTrigger>
          <TabsTrigger value="discount-types">Discount types</TabsTrigger>
        </TabsList>
        <TabsContent value="product-discounts" className="mt-4 outline-none">
          <p className="text-sm text-muted-foreground mb-4">
            View, filter, and edit discounts assigned to products. Add new
            product-level discounts from here.
          </p>
          <DiscountsTab />
        </TabsContent>
        <TabsContent value="discount-types" className="mt-4 outline-none">
          <p className="text-sm text-muted-foreground mb-4">
            Create named discount types (e.g. member, seasonal). Then assign
            them to products on the Product discounts tab or in each
            product&apos;s form.
          </p>
          <DiscountTypesCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
