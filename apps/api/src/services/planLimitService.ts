/**
 * Plan Limit Service — shared logic for checking resource limits and add-ons.
 *
 * Used by the enforcePlanLimits middleware and the /usage endpoint.
 * All queries use basePrisma (unscoped) since we need cross-model counts
 * and the Contact model has no tenantId column.
 */

import { basePrisma } from "@/config/prisma";
import {
  DEFAULT_PLAN_LIMITS,
  RESOURCE_LIMIT_MAP,
  PlanTier,
  type LimitedResource,
  type PlanLimits,
} from "@repo/shared";

type AddOnType = keyof typeof addOnTypeMap;

const addOnTypeMap = {
  EXTRA_USER: "users",
  EXTRA_PRODUCT: "products",
  EXTRA_LOCATION: "locations",
  EXTRA_MEMBER: "members",
  EXTRA_CATEGORY: "categories",
  EXTRA_CONTACT: "contacts",
} as const;

/**
 * Fetch the PlanLimit row for a given tier, falling back to DEFAULT_PLAN_LIMITS.
 */
export async function getPlanLimitsForTier(tier: string): Promise<PlanLimits> {
  const row = await basePrisma.planLimit.findUnique({
    where: { tier: tier as any },
  });

  if (!row) {
    const planTier = tier as PlanTier;
    return (
      DEFAULT_PLAN_LIMITS[planTier] ?? DEFAULT_PLAN_LIMITS[PlanTier.STARTER]
    );
  }

  return {
    maxUsers: row.maxUsers,
    maxProducts: row.maxProducts,
    maxLocations: row.maxLocations,
    maxMembers: row.maxMembers,
    maxCategories: row.maxCategories,
    maxContacts: row.maxContacts,
    bulkUpload: row.bulkUpload,
    analytics: row.analytics,
    promoManagement: row.promoManagement,
    auditLogs: row.auditLogs,
    apiAccess: row.apiAccess,
  };
}

/**
 * Sum active TenantAddOn quantities for a tenant, grouped by add-on type.
 */
export async function getActiveAddOns(
  tenantId: string,
): Promise<Record<string, number>> {
  const now = new Date();

  const addOns = await basePrisma.tenantAddOn.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
      OR: [{ periodEnd: null }, { periodEnd: { gte: now } }],
    },
    select: { type: true, quantity: true },
  });

  const grouped: Record<string, number> = {};
  for (const addOn of addOns) {
    grouped[addOn.type] = (grouped[addOn.type] ?? 0) + addOn.quantity;
  }
  return grouped;
}

/**
 * Count the current number of a resource for a tenant.
 * Contact has no tenantId — counted via owner.tenantId.
 */
export async function getResourceCount(
  tenantId: string,
  resource: LimitedResource,
): Promise<number> {
  switch (resource) {
    case "users":
      return basePrisma.user.count({ where: { tenantId } });
    case "products":
      return basePrisma.product.count({
        where: { tenantId, deletedAt: null },
      });
    case "locations":
      return basePrisma.location.count({
        where: { tenantId, deletedAt: null },
      });
    case "members":
      return basePrisma.member.count({
        where: { tenantId, deletedAt: null },
      });
    case "categories":
      return basePrisma.category.count({
        where: { tenantId, deletedAt: null },
      });
    case "contacts":
      return basePrisma.contact.count({
        where: { owner: { tenantId }, deletedAt: null },
      });
    default:
      return 0;
  }
}

/**
 * Get the effective limit for a resource: base plan limit + active add-ons.
 * Returns -1 for unlimited.
 */
export async function getEffectiveLimit(
  tenantId: string,
  tier: string,
  resource: LimitedResource,
): Promise<{
  baseLimit: number;
  addOnQuantity: number;
  effectiveLimit: number;
}> {
  const limits = await getPlanLimitsForTier(tier);
  const mapping = RESOURCE_LIMIT_MAP[resource];
  const baseLimit = limits[mapping.limitField as keyof PlanLimits] as number;

  if (baseLimit === -1) {
    return { baseLimit: -1, addOnQuantity: 0, effectiveLimit: -1 };
  }

  const activeAddOns = await getActiveAddOns(tenantId);
  const addOnQuantity = activeAddOns[mapping.addOnType] ?? 0;

  return {
    baseLimit,
    addOnQuantity,
    effectiveLimit: baseLimit + addOnQuantity,
  };
}

export interface ResourceUsage {
  resource: LimitedResource;
  current: number;
  baseLimit: number;
  addOnQuantity: number;
  effectiveLimit: number;
  usagePercent: number;
  isAtLimit: boolean;
}

/**
 * Get a full usage summary for all limited resources for a tenant.
 */
export async function getTenantUsageSummary(
  tenantId: string,
  tier: string,
): Promise<ResourceUsage[]> {
  const resources = Object.keys(RESOURCE_LIMIT_MAP) as LimitedResource[];

  const [limits, activeAddOns, ...counts] = await Promise.all([
    getPlanLimitsForTier(tier),
    getActiveAddOns(tenantId),
    ...resources.map((r) => getResourceCount(tenantId, r)),
  ]);

  return resources.map((resource, i) => {
    const mapping = RESOURCE_LIMIT_MAP[resource];
    const baseLimit = limits[mapping.limitField as keyof PlanLimits] as number;
    const addOnQuantity = activeAddOns[mapping.addOnType] ?? 0;
    const effectiveLimit = baseLimit === -1 ? -1 : baseLimit + addOnQuantity;
    const current = counts[i];
    const usagePercent =
      effectiveLimit === -1 ? 0 : Math.round((current / effectiveLimit) * 100);

    return {
      resource,
      current,
      baseLimit,
      addOnQuantity,
      effectiveLimit,
      usagePercent: Math.min(usagePercent, 100),
      isAtLimit: effectiveLimit !== -1 && current >= effectiveLimit,
    };
  });
}
