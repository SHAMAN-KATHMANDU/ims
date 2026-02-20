/**
 * Usage Controller — tenant-facing endpoints for resource usage and add-on management.
 */

import { Request, Response } from "express";
import { basePrisma } from "@/config/prisma";
import { sendControllerError } from "@/utils/controllerError";
import {
  getTenantUsageSummary,
  getResourceCount,
  getEffectiveLimit,
} from "@/services/planLimitService";
import { RESOURCE_LIMIT_MAP, type LimitedResource } from "@repo/shared";

const validResources = Object.keys(RESOURCE_LIMIT_MAP);

class UsageController {
  /**
   * GET /usage — full usage summary for the tenant.
   */
  async getUsage(req: Request, res: Response) {
    try {
      const tenant = req.tenant;
      if (!tenant) {
        return res.status(403).json({ message: "Tenant context required" });
      }

      const usage = await getTenantUsageSummary(tenant.id, tenant.plan);
      res.status(200).json({ usage, plan: tenant.plan });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get usage error");
    }
  }

  /**
   * GET /usage/:resource — usage for a single resource.
   */
  async getResourceUsage(req: Request, res: Response) {
    try {
      const tenant = req.tenant;
      if (!tenant) {
        return res.status(403).json({ message: "Tenant context required" });
      }

      const { resource } = req.params;
      if (!validResources.includes(resource)) {
        return res.status(400).json({
          message: `resource must be one of: ${validResources.join(", ")}`,
        });
      }

      const r = resource as LimitedResource;
      const [current, limits] = await Promise.all([
        getResourceCount(tenant.id, r),
        getEffectiveLimit(tenant.id, tenant.plan, r),
      ]);

      const usagePercent =
        limits.effectiveLimit === -1
          ? 0
          : Math.round((current / limits.effectiveLimit) * 100);

      res.status(200).json({
        resource: r,
        current,
        baseLimit: limits.baseLimit,
        addOnQuantity: limits.addOnQuantity,
        effectiveLimit: limits.effectiveLimit,
        usagePercent: Math.min(usagePercent, 100),
        isAtLimit:
          limits.effectiveLimit !== -1 && current >= limits.effectiveLimit,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get resource usage error");
    }
  }

  /**
   * POST /add-ons/request — tenant requests an add-on (PENDING until admin approves).
   */
  async requestAddOn(req: Request, res: Response) {
    try {
      const tenant = req.tenant;
      if (!tenant) {
        return res.status(403).json({ message: "Tenant context required" });
      }

      const { type, quantity, notes } = req.body;

      if (!type) {
        return res.status(400).json({ message: "type is required" });
      }

      const validTypes = [
        "EXTRA_USER",
        "EXTRA_PRODUCT",
        "EXTRA_LOCATION",
        "EXTRA_MEMBER",
        "EXTRA_CATEGORY",
        "EXTRA_CONTACT",
      ];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          message: `type must be one of: ${validTypes.join(", ")}`,
        });
      }

      const addOn = await basePrisma.tenantAddOn.create({
        data: {
          tenantId: tenant.id,
          type: type as any,
          quantity: quantity ?? 1,
          status: "PENDING",
          notes: notes ?? null,
        },
      });

      res.status(201).json({
        message:
          "Add-on request submitted. A platform administrator will review and approve it.",
        addOn,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Request add-on error");
    }
  }

  /**
   * GET /add-ons — tenant views their add-ons.
   */
  async getAddOns(req: Request, res: Response) {
    try {
      const tenant = req.tenant;
      if (!tenant) {
        return res.status(403).json({ message: "Tenant context required" });
      }

      const addOns = await basePrisma.tenantAddOn.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: "desc" },
      });

      res.status(200).json({ addOns });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get add-ons error");
    }
  }

  /**
   * GET /plans — plans with pricing for tenant-facing upgrade display (read-only).
   */
  async getPlansWithPricing(req: Request, res: Response) {
    try {
      const plans = await basePrisma.plan.findMany({
        where: { isActive: true },
        orderBy: { rank: "asc" },
      });

      const pricingPlans = await basePrisma.pricingPlan.findMany({
        where: { isActive: true },
      });

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

      res.status(200).json({ plans: plansWithPricing });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Get plans with pricing error",
      );
    }
  }

  /**
   * GET /add-ons/pricing — available add-on pricing for the tenant's plan tier.
   */
  async getAddOnPricing(req: Request, res: Response) {
    try {
      const tenant = req.tenant;
      if (!tenant) {
        return res.status(403).json({ message: "Tenant context required" });
      }

      const pricing = await basePrisma.addOnPricing.findMany({
        where: {
          isActive: true,
          OR: [{ tier: null }, { tier: tenant.plan as any }],
        },
        orderBy: [{ type: "asc" }, { billingCycle: "asc" }],
      });

      res.status(200).json({ pricing });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get add-on pricing error");
    }
  }
}

export default new UsageController();
