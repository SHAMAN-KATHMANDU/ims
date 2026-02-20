"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TenantOverviewTab } from "./components/TenantOverviewTab";
import { SubscriptionsTab } from "./components/SubscriptionsTab";
import { PaymentsTab } from "./components/PaymentsTab";
import { PricingPlansTab } from "./components/PricingPlansTab";
import { AddOnPricingTab } from "./components/AddOnPricingTab";
import { TenantAddOnsTab } from "./components/TenantAddOnsTab";

export function PlatformBillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscriptions</h1>
        <p className="text-muted-foreground mt-1">
          Manage tenant subscriptions, payments, pricing, and add-ons
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Tenants</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="pricing">Pricing Plans</TabsTrigger>
          <TabsTrigger value="addon-pricing">Add-On Pricing</TabsTrigger>
          <TabsTrigger value="tenant-addons">Tenant Add-Ons</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <TenantOverviewTab />
        </TabsContent>
        <TabsContent value="subscriptions">
          <SubscriptionsTab />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsTab />
        </TabsContent>
        <TabsContent value="pricing">
          <PricingPlansTab />
        </TabsContent>
        <TabsContent value="addon-pricing">
          <AddOnPricingTab />
        </TabsContent>
        <TabsContent value="tenant-addons">
          <TenantAddOnsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
