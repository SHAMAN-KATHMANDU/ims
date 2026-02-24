/**
 * Usage repository - database access for usage/plans/add-ons.
 * Uses basePrisma (platform/unscoped) for Plan, PricingPlan, TenantAddOn, AddOnPricing, Tenant.
 */

import { basePrisma } from "@/config/prisma";

export const usageRepository = {
  getTenantById(tenantId: string) {
    return basePrisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, plan: true },
    });
  },

  findPlansActive() {
    return basePrisma.plan.findMany({
      where: { isActive: true },
      orderBy: { rank: "asc" },
    });
  },

  findPricingPlansActive() {
    return basePrisma.pricingPlan.findMany({
      where: { isActive: true },
    });
  },

  findAddOnPricingForTier(tier: string | null) {
    return basePrisma.addOnPricing.findMany({
      where: {
        isActive: true,
        OR: [{ tier: null }, { tier: tier as any }],
      },
      orderBy: [{ type: "asc" }, { billingCycle: "asc" }],
    });
  },

  findAddOnsByTenant(tenantId: string) {
    return basePrisma.tenantAddOn.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  },

  createTenantAddOn(data: {
    tenantId: string;
    type: string;
    quantity: number;
    status: string;
    notes: string | null;
  }) {
    return basePrisma.tenantAddOn.create({
      data: {
        tenantId: data.tenantId,
        type: data.type as any,
        quantity: data.quantity,
        status: data.status as any,
        notes: data.notes,
      },
    });
  },
};
