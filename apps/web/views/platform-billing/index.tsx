"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsTab } from "./components/AnalyticsTab";
import { TenantOverviewTab } from "./components/TenantOverviewTab";
import { SubscriptionsTab } from "./components/SubscriptionsTab";
import { PaymentsTab } from "./components/PaymentsTab";
import { PlansAndPricingTab } from "./components/PlansAndPricingTab";
import { TenantAddOnsTab } from "./components/TenantAddOnsTab";
import {
  BarChart3,
  Building2,
  CreditCard,
  Receipt,
  Settings2,
  Package,
} from "lucide-react";

export function PlatformBillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage tenants, subscriptions, payments, plans, and add-ons
        </p>
      </div>

      <Tabs defaultValue="analytics">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="tenants" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            Tenants
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5">
            <Receipt className="h-3.5 w-3.5" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            Plans & Pricing
          </TabsTrigger>
          <TabsTrigger value="addons" className="gap-1.5">
            <Package className="h-3.5 w-3.5" />
            Add-Ons
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-4">
          <AnalyticsTab />
        </TabsContent>
        <TabsContent value="tenants" className="mt-4">
          <TenantOverviewTab />
        </TabsContent>
        <TabsContent value="subscriptions" className="mt-4">
          <SubscriptionsTab />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <PaymentsTab />
        </TabsContent>
        <TabsContent value="plans" className="mt-4">
          <PlansAndPricingTab />
        </TabsContent>
        <TabsContent value="addons" className="mt-4">
          <TenantAddOnsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
