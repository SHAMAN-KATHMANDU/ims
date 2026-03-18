/**
 * Enforce Plan Limits Middleware
 *
 * Checks that the tenant has not reached the plan limit for a given resource
 * before allowing create operations. Must run AFTER resolveTenant and checkSubscription.
 *
 * Usage: Apply to create routes, e.g. enforcePlanLimits('products') on POST /products
 */

import { Request, Response, NextFunction } from "express";
import prisma from "@/config/prisma";
import { basePrisma } from "@/config/prisma";
import {
  DEFAULT_PLAN_LIMITS,
  type PlanLimits,
  type PlanTier,
} from "@repo/shared";

export type PlanLimitResource =
  | "users"
  | "products"
  | "locations"
  | "members"
  | "customers";

const RESOURCE_TO_LIMIT_KEY: Record<
  PlanLimitResource,
  keyof Pick<
    PlanLimits,
    "maxUsers" | "maxProducts" | "maxLocations" | "maxMembers" | "maxCustomers"
  >
> = {
  users: "maxUsers",
  products: "maxProducts",
  locations: "maxLocations",
  members: "maxMembers",
  customers: "maxCustomers",
};

const RESOURCE_LABEL: Record<PlanLimitResource, string> = {
  users: "users",
  products: "products",
  locations: "locations",
  members: "members",
  customers: "customers",
};

/** Tenant override field names (nullable int; -1 = unlimited) */
const RESOURCE_TO_TENANT_OVERRIDE: Record<
  PlanLimitResource,
  | "customMaxUsers"
  | "customMaxProducts"
  | "customMaxLocations"
  | "customMaxMembers"
  | "customMaxCustomers"
> = {
  users: "customMaxUsers",
  products: "customMaxProducts",
  locations: "customMaxLocations",
  members: "customMaxMembers",
  customers: "customMaxCustomers",
};

/**
 * Returns a middleware that enforces the plan limit for the given resource.
 * If the tenant is at or over the limit, responds with 403 and does not call next().
 */
export function enforcePlanLimits(resource: PlanLimitResource) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenant = req.tenant;

    if (!tenant || req.user?.role === "platformAdmin") {
      return next();
    }

    const plan = tenant.plan as PlanTier;
    const limitKey = RESOURCE_TO_LIMIT_KEY[resource];
    const label = RESOURCE_LABEL[resource];

    let limits: PlanLimits;

    try {
      const planLimitRow = await basePrisma.planLimit.findUnique({
        where: { tier: plan },
      });
      if (planLimitRow) {
        const row = planLimitRow as typeof planLimitRow & {
          maxCustomers: number;
        };
        limits = {
          maxUsers: row.maxUsers,
          maxProducts: row.maxProducts,
          maxLocations: row.maxLocations,
          maxMembers: row.maxMembers,
          maxCustomers: row.maxCustomers,
          bulkUpload: row.bulkUpload,
          analytics: row.analytics,
          promoManagement: row.promoManagement,
          auditLogs: row.auditLogs,
          apiAccess: row.apiAccess,
          salesPipeline: row.salesPipeline,
          messaging: row.messaging,
        };
      } else {
        limits = DEFAULT_PLAN_LIMITS[plan] ?? DEFAULT_PLAN_LIMITS.STARTER;
      }
    } catch {
      limits = DEFAULT_PLAN_LIMITS[plan] ?? DEFAULT_PLAN_LIMITS.STARTER;
    }

    let limit = limits[limitKey] as number;
    const overrideKey = RESOURCE_TO_TENANT_OVERRIDE[resource];
    const tenantOverride = (
      tenant as unknown as Record<string, number | null | undefined>
    )[overrideKey];
    if (tenantOverride !== undefined && tenantOverride !== null) {
      limit = tenantOverride;
    }
    if (limit === -1) {
      return next();
    }

    let currentCount: number;

    try {
      switch (resource) {
        case "users":
          currentCount = await prisma.user.count();
          break;
        case "products":
          currentCount = await prisma.product.count();
          break;
        case "locations":
          currentCount = await prisma.location.count();
          break;
        case "members":
          currentCount = await prisma.member.count();
          break;
        case "customers":
          currentCount = await prisma.contact.count();
          break;
        default:
          return next();
      }
    } catch (err) {
      return next(err);
    }

    if (currentCount >= limit) {
      return res.status(403).json({
        error: "plan_limit_exceeded",
        message: `Your plan allows a maximum of ${limit} ${label}. Upgrade your plan to add more.`,
        resource,
        limit,
        current: currentCount,
      });
    }

    next();
  };
}

/** Plan feature flags that can be gated (from PlanLimit / DEFAULT_PLAN_LIMITS). */
export type PlanFeature =
  | "bulkUpload"
  | "analytics"
  | "promoManagement"
  | "auditLogs"
  | "apiAccess"
  | "salesPipeline"
  | "messaging";

const FEATURE_MESSAGE: Record<PlanFeature, string> = {
  bulkUpload:
    "Bulk upload is not available on your plan. Upgrade to Professional or higher to import from CSV/Excel.",
  analytics:
    "Advanced analytics is not available on your plan. Upgrade to Professional or higher.",
  promoManagement:
    "Promo code management is not available on your plan. Upgrade to Professional or higher.",
  auditLogs:
    "Audit logs are not available on your plan. Upgrade to Enterprise.",
  apiAccess: "API access is not available on your plan. Upgrade to Enterprise.",
  salesPipeline:
    "Sales pipeline is not available on your plan. Upgrade to Professional or higher.",
  messaging:
    "Messaging is not available on your plan. Upgrade to Professional or higher.",
};

/**
 * Returns a middleware that requires the given plan feature to be enabled for the tenant's plan.
 * If the feature is disabled, responds with 403 and does not call next().
 * Must run AFTER resolveTenant and checkSubscription.
 */
export function enforcePlanFeature(feature: PlanFeature) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenant = req.tenant;

    if (!tenant || req.user?.role === "platformAdmin") {
      return next();
    }

    const plan = tenant.plan as PlanTier;

    let limits: PlanLimits;

    try {
      const planLimitRow = await basePrisma.planLimit.findUnique({
        where: { tier: plan },
      });
      if (planLimitRow) {
        const row = planLimitRow as typeof planLimitRow & {
          maxCustomers: number;
        };
        limits = {
          maxUsers: row.maxUsers,
          maxProducts: row.maxProducts,
          maxLocations: row.maxLocations,
          maxMembers: row.maxMembers,
          maxCustomers: row.maxCustomers,
          bulkUpload: row.bulkUpload,
          analytics: row.analytics,
          promoManagement: row.promoManagement,
          auditLogs: row.auditLogs,
          apiAccess: row.apiAccess,
          salesPipeline: row.salesPipeline,
          messaging: row.messaging,
        };
      } else {
        limits = DEFAULT_PLAN_LIMITS[plan] ?? DEFAULT_PLAN_LIMITS.STARTER;
      }
    } catch {
      limits = DEFAULT_PLAN_LIMITS[plan] ?? DEFAULT_PLAN_LIMITS.STARTER;
    }

    const enabled = limits[feature];

    if (!enabled) {
      return res.status(403).json({
        error: "feature_not_available",
        message: FEATURE_MESSAGE[feature],
        feature,
      });
    }

    next();
  };
}

/** Usage + limit for a single resource (used by frontend for "X of Y" display). */
export interface ResourceUsage {
  used: number;
  limit: number; // -1 = unlimited
}

/** Response shape for GET /dashboard/usage. */
export interface TenantUsageResponse {
  users: ResourceUsage;
  locations: ResourceUsage;
  products: ResourceUsage;
}

/**
 * Get current usage counts and plan limits for the tenant.
 * Used by frontend to show "X of Y users/locations/products".
 * Must be called within a request that has gone through resolveTenant.
 */
export async function getTenantUsage(
  tenant: { plan: string; [k: string]: unknown } | null | undefined,
): Promise<TenantUsageResponse | null> {
  if (!tenant) return null;

  const plan = tenant.plan as PlanTier;
  let limits: PlanLimits;

  try {
    const planLimitRow = await basePrisma.planLimit.findUnique({
      where: { tier: plan },
    });
    if (planLimitRow) {
      const row = planLimitRow as typeof planLimitRow & {
        maxCustomers: number;
      };
      limits = {
        maxUsers: row.maxUsers,
        maxProducts: row.maxProducts,
        maxLocations: row.maxLocations,
        maxMembers: row.maxMembers,
        maxCustomers: row.maxCustomers,
        bulkUpload: row.bulkUpload,
        analytics: row.analytics,
        promoManagement: row.promoManagement,
        auditLogs: row.auditLogs,
        apiAccess: row.apiAccess,
        salesPipeline: row.salesPipeline,
        messaging: row.messaging,
      };
    } else {
      limits = DEFAULT_PLAN_LIMITS[plan] ?? DEFAULT_PLAN_LIMITS.STARTER;
    }
  } catch {
    limits = DEFAULT_PLAN_LIMITS[plan] ?? DEFAULT_PLAN_LIMITS.STARTER;
  }

  const getLimit = (key: PlanLimitResource): number => {
    let limit = limits[RESOURCE_TO_LIMIT_KEY[key]] as number;
    const overrideKey = RESOURCE_TO_TENANT_OVERRIDE[key];
    const tenantOverride = (
      tenant as unknown as Record<string, number | null | undefined>
    )[overrideKey];
    if (tenantOverride !== undefined && tenantOverride !== null) {
      limit = tenantOverride;
    }
    return limit;
  };

  const [usersUsed, locationsUsed, productsUsed] = await Promise.all([
    prisma.user.count(),
    prisma.location.count(),
    prisma.product.count(),
  ]);

  return {
    users: { used: usersUsed, limit: getLimit("users") },
    locations: { used: locationsUsed, limit: getLimit("locations") },
    products: { used: productsUsed, limit: getLimit("products") },
  };
}

export default enforcePlanLimits;
