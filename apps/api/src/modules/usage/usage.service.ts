/**
 * Usage service - business logic for usage, plans, and add-ons.
 */

import type { LimitedResource } from "@repo/shared";
import {
  getTenantUsageSummary,
  getResourceCount,
  getEffectiveLimit,
} from "@/services/planLimitService";
import { NotFoundError } from "@/shared/errors";
import { usageRepository } from "./usage.repository";

export type RequestAddOnBody = {
  type: string;
  quantity?: number;
  notes?: string;
};

export const usageService = {
  async getUsage(tenantId: string) {
    const tenant = await usageRepository.getTenantById(tenantId);
    if (!tenant) {
      throw new NotFoundError("Tenant not found");
    }
    const usage = await getTenantUsageSummary(tenantId, tenant.plan);
    return { usage, plan: tenant.plan };
  },

  async getResourceUsage(tenantId: string, resource: LimitedResource) {
    const tenant = await usageRepository.getTenantById(tenantId);
    if (!tenant) {
      throw new NotFoundError("Tenant not found");
    }
    const [current, limits] = await Promise.all([
      getResourceCount(tenantId, resource),
      getEffectiveLimit(tenantId, tenant.plan, resource),
    ]);
    const usagePercent =
      limits.effectiveLimit === -1
        ? 0
        : Math.round((current / limits.effectiveLimit) * 100);
    return {
      resource,
      current,
      baseLimit: limits.baseLimit,
      addOnQuantity: limits.addOnQuantity,
      effectiveLimit: limits.effectiveLimit,
      usagePercent: Math.min(usagePercent, 100),
      isAtLimit:
        limits.effectiveLimit !== -1 && current >= limits.effectiveLimit,
    };
  },

  async requestAddOn(tenantId: string, body: RequestAddOnBody) {
    const addOn = await usageRepository.createTenantAddOn({
      tenantId,
      type: body.type,
      quantity: body.quantity ?? 1,
      status: "PENDING",
      notes: body.notes ?? null,
    });
    return { addOn };
  },

  async getAddOns(tenantId: string) {
    const addOns = await usageRepository.findAddOnsByTenant(tenantId);
    return { addOns };
  },

  async getPlansWithPricing() {
    const [plans, pricingPlans] = await Promise.all([
      usageRepository.findPlansActive(),
      usageRepository.findPricingPlansActive(),
    ]);
    const plansWithPricing = plans.map((plan) => {
      const monthly = pricingPlans.find(
        (p) => p.tier === plan.tier && p.billingCycle === "MONTHLY",
      );
      const annual = pricingPlans.find(
        (p) => p.tier === plan.tier && p.billingCycle === "ANNUAL",
      );
      return {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        tier: plan.tier,
        rank: plan.rank,
        description: plan.description,
        priceMonthly: monthly ? Number(monthly.price) : null,
        priceAnnual: annual ? Number(annual.price) : null,
      };
    });
    return { plans: plansWithPricing };
  },

  async getAddOnPricing(tenantId: string) {
    const tenant = await usageRepository.getTenantById(tenantId);
    if (!tenant) {
      throw new NotFoundError("Tenant not found");
    }
    const pricing = await usageRepository.findAddOnPricingForTier(tenant.plan);
    return { pricing };
  },
};
