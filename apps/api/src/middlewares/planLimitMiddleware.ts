/**
 * Plan Limit Enforcement Middleware
 *
 * Factory function that returns Express middleware for a specific resource.
 * Checks the tenant's current usage against their plan limits + active add-ons.
 *
 * Must run AFTER resolveTenant (needs req.tenant).
 *
 * Usage:
 *   router.post("/", enforcePlanLimits("products"), controller.create)
 */

import { Request, Response, NextFunction } from "express";
import {
  getResourceCount,
  getEffectiveLimit,
} from "@/services/planLimitService";
import { RESOURCE_LIMIT_MAP, type LimitedResource } from "@repo/shared";

const RESOURCE_LABELS: Record<LimitedResource, string> = {
  users: "users",
  products: "products",
  locations: "locations",
  members: "members",
  categories: "categories",
  contacts: "contacts",
};

export function enforcePlanLimits(resource: LimitedResource) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenant = req.tenant;

      if (!tenant) {
        return next();
      }

      // Platform admins bypass limits
      if (req.user?.role === "platformAdmin") {
        return next();
      }

      // Enterprise plan has no limits (-1 = unlimited)
      if (tenant.plan === "ENTERPRISE") {
        return next();
      }

      const tenantId = tenant.id;
      const tier = tenant.plan;

      const { baseLimit, addOnQuantity, effectiveLimit } =
        await getEffectiveLimit(tenantId, tier, resource);

      if (effectiveLimit === -1) {
        return next();
      }

      const current = await getResourceCount(tenantId, resource);

      if (current >= effectiveLimit) {
        const label = RESOURCE_LABELS[resource];
        const addOnType = RESOURCE_LIMIT_MAP[resource].addOnType;

        return res.status(403).json({
          error: "plan_limit_reached",
          resource,
          current,
          limit: baseLimit,
          addOns: addOnQuantity,
          effectiveLimit,
          message: `You have reached the maximum number of ${label} (${effectiveLimit}) for your ${tier} plan.`,
          canPurchaseAddOn: true,
          addOnType,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
