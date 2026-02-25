/**
 * Platform Controller — Tenant CRUD for platform administrators.
 *
 * All operations here use basePrisma (unscoped) because platform admins
 * operate across tenants.
 */

import { Request, Response } from "express";
import { basePrisma } from "@/config/prisma";
import bcrypt from "bcryptjs";
import { DEFAULT_PLAN_LIMITS, PlanTier } from "@repo/shared";
import { sendControllerError } from "@/utils/controllerError";

const PLAN_TIERS: PlanTier[] = [
  PlanTier.STARTER,
  PlanTier.PROFESSIONAL,
  PlanTier.ENTERPRISE,
];

class PlatformController {
  /**
   * Create a new tenant with an initial superAdmin user.
   */
  async createTenant(req: Request, res: Response) {
    try {
      const {
        name,
        slug,
        plan = "STARTER",
        adminUsername,
        adminPassword,
      } = req.body;

      if (!name || !slug || !adminUsername || !adminPassword) {
        return res.status(400).json({
          message:
            "name, slug, adminUsername, and adminPassword are all required",
        });
      }

      // Validate slug format (lowercase, alphanumeric, hyphens only)
      if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) {
        return res.status(400).json({
          message:
            "Slug must be lowercase alphanumeric with optional hyphens, 1-63 characters",
        });
      }

      // Check slug uniqueness
      const existingTenant = await basePrisma.tenant.findUnique({
        where: { slug },
      });
      if (existingTenant) {
        return res
          .status(409)
          .json({ message: `Tenant with slug "${slug}" already exists` });
      }

      // Create tenant + initial superAdmin user in a transaction
      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

      const result = await basePrisma.$transaction(async (tx) => {
        // Create tenant
        const tenant = await tx.tenant.create({
          data: {
            name,
            slug,
            plan: plan as any,
            isTrial: true,
            trialEndsAt,
            subscriptionStatus: "TRIAL",
          },
        });

        // Create initial superAdmin user for the tenant
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        const adminUser = await tx.user.create({
          data: {
            tenantId: tenant.id,
            username: adminUsername.toLowerCase().trim(),
            password: hashedPassword,
            role: "superAdmin",
          },
        });

        // Create default discount types for the tenant
        const discountTypeNames = [
          "Non-Member",
          "Member",
          "Wholesale",
          "Special",
        ];
        for (const dtName of discountTypeNames) {
          await tx.discountType.create({
            data: {
              tenantId: tenant.id,
              name: dtName,
            },
          });
        }

        return {
          tenant,
          adminUser: {
            id: adminUser.id,
            username: adminUser.username,
            role: adminUser.role,
          },
        };
      });

      res.status(201).json({
        message: "Tenant created successfully",
        tenant: result.tenant,
        adminUser: result.adminUser,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Create tenant error");
    }
  }

  /**
   * List all tenants with summary stats.
   */
  async listTenants(req: Request, res: Response) {
    try {
      const tenants = await basePrisma.tenant.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              users: true,
              products: true,
              locations: true,
              members: true,
              sales: true,
            },
          },
        },
      });

      res.status(200).json({ tenants });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "List tenants error");
    }
  }

  /**
   * Get a single tenant with detailed info.
   */
  async getTenant(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const tenant = await basePrisma.tenant.findUnique({
        where: { id },
        include: {
          users: {
            select: { id: true, username: true, role: true },
            orderBy: { createdAt: "asc" },
          },
          _count: {
            select: {
              users: true,
              products: true,
              locations: true,
              members: true,
              sales: true,
              transfers: true,
            },
          },
          subscriptions: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
          payments: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });

      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      res.status(200).json({ tenant });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get tenant error");
    }
  }

  /**
   * Reset a tenant user's password (platform admin only, no current password required).
   */
  async resetTenantUserPassword(req: Request, res: Response) {
    try {
      const { tenantId, userId } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || typeof newPassword !== "string") {
        return res.status(400).json({
          message: "newPassword is required",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          message: "Password must be at least 6 characters",
        });
      }

      const user = await basePrisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.tenantId !== tenantId) {
        return res.status(403).json({
          message: "User does not belong to this tenant",
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await basePrisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      res.status(200).json({
        message: "Password reset successfully",
      });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Reset tenant user password error",
      );
    }
  }

  /**
   * Update a tenant's details.
   */
  async updateTenant(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        name,
        slug,
        isActive,
        subscriptionStatus,
        isTrial,
        trialEndsAt,
        planExpiresAt,
        settings,
        customMaxUsers,
        customMaxProducts,
        customMaxLocations,
        customMaxMembers,
        customMaxCustomers,
      } = req.body;

      // Check if tenant exists
      const existingTenant = await basePrisma.tenant.findUnique({
        where: { id },
      });

      if (!existingTenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      // If slug is being updated, validate it and check uniqueness
      if (slug !== undefined && slug !== existingTenant.slug) {
        if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) {
          return res.status(400).json({
            message:
              "Slug must be lowercase alphanumeric with optional hyphens, 1-63 characters",
          });
        }

        const slugExists = await basePrisma.tenant.findUnique({
          where: { slug },
        });
        if (slugExists) {
          return res
            .status(409)
            .json({ message: `Tenant with slug "${slug}" already exists` });
        }
      }

      // Validate subscriptionStatus if provided
      if (subscriptionStatus !== undefined) {
        const validStatuses = [
          "TRIAL",
          "ACTIVE",
          "PAST_DUE",
          "SUSPENDED",
          "LOCKED",
          "CANCELLED",
        ];
        if (!validStatuses.includes(subscriptionStatus)) {
          return res.status(400).json({
            message: `subscriptionStatus must be one of: ${validStatuses.join(", ")}`,
          });
        }
      }

      const tenant = await basePrisma.tenant.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(slug !== undefined && { slug }),
          ...(isActive !== undefined && { isActive }),
          ...(subscriptionStatus !== undefined && { subscriptionStatus }),
          ...(isTrial !== undefined && { isTrial }),
          ...(trialEndsAt !== undefined && {
            trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null,
          }),
          ...(planExpiresAt !== undefined && {
            planExpiresAt: planExpiresAt ? new Date(planExpiresAt) : null,
          }),
          ...(settings !== undefined && { settings }),
          ...(customMaxUsers !== undefined && {
            customMaxUsers:
              customMaxUsers === null || customMaxUsers === ""
                ? null
                : Number(customMaxUsers),
          }),
          ...(customMaxProducts !== undefined && {
            customMaxProducts:
              customMaxProducts === null || customMaxProducts === ""
                ? null
                : Number(customMaxProducts),
          }),
          ...(customMaxLocations !== undefined && {
            customMaxLocations:
              customMaxLocations === null || customMaxLocations === ""
                ? null
                : Number(customMaxLocations),
          }),
          ...(customMaxMembers !== undefined && {
            customMaxMembers:
              customMaxMembers === null || customMaxMembers === ""
                ? null
                : Number(customMaxMembers),
          }),
          ...(customMaxCustomers !== undefined && {
            customMaxCustomers:
              customMaxCustomers === null || customMaxCustomers === ""
                ? null
                : Number(customMaxCustomers),
          }),
        },
      });

      res.status(200).json({ tenant });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Update tenant error");
    }
  }

  /**
   * Change a tenant's plan.
   */
  async changePlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { plan, expiresAt } = req.body;

      if (!plan) {
        return res.status(400).json({ message: "plan is required" });
      }

      const validPlans = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];
      if (!validPlans.includes(plan)) {
        return res.status(400).json({
          message: `plan must be one of: ${validPlans.join(", ")}`,
        });
      }

      const tenant = await basePrisma.tenant.update({
        where: { id },
        data: {
          plan: plan as any,
          isTrial: false,
          subscriptionStatus: "ACTIVE",
          planExpiresAt: expiresAt ? new Date(expiresAt) : undefined,
        },
      });

      res.status(200).json({
        message: `Plan changed to ${plan}`,
        tenant,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Change plan error");
    }
  }

  /**
   * Deactivate (soft-delete) a tenant.
   */
  async deactivateTenant(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const tenant = await basePrisma.tenant.findUnique({
        where: { id },
      });

      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const updatedTenant = await basePrisma.tenant.update({
        where: { id },
        data: {
          isActive: false,
          subscriptionStatus: "CANCELLED",
        },
      });

      res.status(200).json({
        message: "Tenant deactivated",
        tenant: updatedTenant,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Deactivate tenant error");
    }
  }

  /**
   * Activate a tenant (reactivate a deactivated tenant).
   */
  async activateTenant(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const tenant = await basePrisma.tenant.findUnique({
        where: { id },
      });

      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const updatedTenant = await basePrisma.tenant.update({
        where: { id },
        data: {
          isActive: true,
          subscriptionStatus:
            tenant.subscriptionStatus === "CANCELLED"
              ? "ACTIVE"
              : tenant.subscriptionStatus,
        },
      });

      res.status(200).json({
        message: "Tenant activated",
        tenant: updatedTenant,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Activate tenant error");
    }
  }

  /**
   * Platform-wide stats overview.
   */
  async getStats(req: Request, res: Response) {
    try {
      const [
        totalTenants,
        activeTenants,
        trialTenants,
        totalUsers,
        totalSales,
        planDistribution,
      ] = await Promise.all([
        basePrisma.tenant.count(),
        basePrisma.tenant.count({ where: { isActive: true } }),
        basePrisma.tenant.count({
          where: { subscriptionStatus: "TRIAL" },
        }),
        basePrisma.user.count(),
        basePrisma.sale.count(),
        basePrisma.tenant.groupBy({
          by: ["plan"],
          _count: true,
          where: { isActive: true },
        }),
      ]);

      res.status(200).json({
        totalTenants,
        activeTenants,
        trialTenants,
        totalUsers,
        totalSales,
        planDistribution: planDistribution.map((p) => ({
          plan: p.plan,
          count: p._count,
        })),
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Platform stats error");
    }
  }

  // ============================================
  // PLAN LIMITS CRUD
  // ============================================

  /**
   * List all plan limits. Returns effective limits for every tier: from DB if a row exists, otherwise from DEFAULT_PLAN_LIMITS so the UI always has values to display.
   */
  async listPlanLimits(req: Request, res: Response) {
    try {
      const rows = await basePrisma.planLimit.findMany({
        orderBy: { tier: "asc" },
      });
      const byTier = new Map(rows.map((r) => [r.tier as PlanTier, r]));

      const planLimits = PLAN_TIERS.map((tier) => {
        const row = byTier.get(tier);
        if (row) {
          const r = row as typeof row & { maxCustomers?: number };
          return {
            id: row.id,
            tier: row.tier,
            maxUsers: row.maxUsers,
            maxProducts: row.maxProducts,
            maxLocations: row.maxLocations,
            maxMembers: row.maxMembers,
            maxCustomers: r.maxCustomers ?? 100,
            bulkUpload: row.bulkUpload,
            analytics: row.analytics,
            promoManagement: row.promoManagement,
            auditLogs: row.auditLogs,
            apiAccess: row.apiAccess,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
          };
        }
        const defaults = DEFAULT_PLAN_LIMITS[tier];
        return {
          id: "",
          tier,
          maxUsers: defaults.maxUsers,
          maxProducts: defaults.maxProducts,
          maxLocations: defaults.maxLocations,
          maxMembers: defaults.maxMembers,
          maxCustomers: defaults.maxCustomers,
          bulkUpload: defaults.bulkUpload,
          analytics: defaults.analytics,
          promoManagement: defaults.promoManagement,
          auditLogs: defaults.auditLogs,
          apiAccess: defaults.apiAccess,
          createdAt: "",
          updatedAt: "",
        };
      });

      res.status(200).json({ planLimits });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "List plan limits error");
    }
  }

  /**
   * Get a single plan limit by tier.
   */
  async getPlanLimit(req: Request, res: Response) {
    try {
      const { tier } = req.params;

      const validTiers = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];
      if (!validTiers.includes(tier)) {
        return res.status(400).json({
          message: `tier must be one of: ${validTiers.join(", ")}`,
        });
      }

      const planLimit = await basePrisma.planLimit.findUnique({
        where: { tier: tier as any },
      });

      if (!planLimit) {
        return res.status(404).json({ message: "Plan limit not found" });
      }

      res.status(200).json({ planLimit });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get plan limit error");
    }
  }

  /**
   * Create or update a plan limit.
   */
  async upsertPlanLimit(req: Request, res: Response) {
    try {
      const {
        tier,
        maxUsers,
        maxProducts,
        maxLocations,
        maxMembers,
        maxCustomers,
        bulkUpload,
        analytics,
        promoManagement,
        auditLogs,
        apiAccess,
      } = req.body;

      if (!tier) {
        return res.status(400).json({ message: "tier is required" });
      }

      const validTiers = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];
      if (!validTiers.includes(tier)) {
        return res.status(400).json({
          message: `tier must be one of: ${validTiers.join(", ")}`,
        });
      }

      const planLimit = await basePrisma.planLimit.upsert({
        where: { tier: tier as any },
        update: {
          ...(maxUsers !== undefined && { maxUsers }),
          ...(maxProducts !== undefined && { maxProducts }),
          ...(maxLocations !== undefined && { maxLocations }),
          ...(maxMembers !== undefined && { maxMembers }),
          ...(maxCustomers !== undefined && { maxCustomers }),
          ...(bulkUpload !== undefined && { bulkUpload }),
          ...(analytics !== undefined && { analytics }),
          ...(promoManagement !== undefined && { promoManagement }),
          ...(auditLogs !== undefined && { auditLogs }),
          ...(apiAccess !== undefined && { apiAccess }),
        },
        create: {
          tier: tier as any,
          maxUsers: maxUsers ?? 5,
          maxProducts: maxProducts ?? 100,
          maxLocations: maxLocations ?? 2,
          maxMembers: maxMembers ?? 50,
          maxCustomers: maxCustomers ?? 100,
          bulkUpload: bulkUpload ?? false,
          analytics: analytics ?? false,
          promoManagement: promoManagement ?? false,
          auditLogs: auditLogs ?? false,
          apiAccess: apiAccess ?? false,
        },
      });

      res.status(200).json({
        message: "Plan limit saved successfully",
        planLimit,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Upsert plan limit error");
    }
  }

  /**
   * Delete a plan limit.
   */
  async deletePlanLimit(req: Request, res: Response) {
    try {
      const { tier } = req.params;

      const validTiers = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];
      if (!validTiers.includes(tier)) {
        return res.status(400).json({
          message: `tier must be one of: ${validTiers.join(", ")}`,
        });
      }

      await basePrisma.planLimit.delete({
        where: { tier: tier as any },
      });

      res.status(200).json({ message: "Plan limit deleted successfully" });
    } catch (error: unknown) {
      const e = error as { code?: string };
      if (e.code === "P2025") {
        return res.status(404).json({ message: "Plan limit not found" });
      }
      return sendControllerError(req, res, error, "Delete plan limit error");
    }
  }

  // ============================================
  // PRICING PLANS CRUD
  // ============================================

  /**
   * List all pricing plans.
   */
  async listPricingPlans(req: Request, res: Response) {
    try {
      const pricingPlans = await basePrisma.pricingPlan.findMany({
        orderBy: [{ tier: "asc" }, { billingCycle: "asc" }],
      });

      res.status(200).json({ pricingPlans });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "List pricing plans error");
    }
  }

  /**
   * Get a pricing plan by tier and billing cycle.
   */
  async getPricingPlan(req: Request, res: Response) {
    try {
      const { tier, billingCycle } = req.params;

      const validTiers = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];
      const validCycles = ["MONTHLY", "ANNUAL"];

      if (!validTiers.includes(tier)) {
        return res.status(400).json({
          message: `tier must be one of: ${validTiers.join(", ")}`,
        });
      }

      if (!validCycles.includes(billingCycle)) {
        return res.status(400).json({
          message: `billingCycle must be one of: ${validCycles.join(", ")}`,
        });
      }

      const pricingPlan = await basePrisma.pricingPlan.findUnique({
        where: {
          tier_billingCycle: {
            tier: tier as any,
            billingCycle: billingCycle as any,
          },
        },
      });

      if (!pricingPlan) {
        return res.status(404).json({ message: "Pricing plan not found" });
      }

      res.status(200).json({ pricingPlan });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get pricing plan error");
    }
  }

  /**
   * Create a pricing plan.
   */
  async createPricingPlan(req: Request, res: Response) {
    try {
      const { tier, billingCycle, price, originalPrice, isActive } = req.body;

      if (!tier || !billingCycle || price === undefined) {
        return res.status(400).json({
          message: "tier, billingCycle, and price are required",
        });
      }

      const validTiers = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];
      const validCycles = ["MONTHLY", "ANNUAL"];

      if (!validTiers.includes(tier)) {
        return res.status(400).json({
          message: `tier must be one of: ${validTiers.join(", ")}`,
        });
      }

      if (!validCycles.includes(billingCycle)) {
        return res.status(400).json({
          message: `billingCycle must be one of: ${validCycles.join(", ")}`,
        });
      }

      if (typeof price !== "number" || price < 0) {
        return res.status(400).json({
          message: "price must be a non-negative number",
        });
      }

      const pricingPlan = await basePrisma.pricingPlan.create({
        data: {
          tier: tier as any,
          billingCycle: billingCycle as any,
          price,
          originalPrice,
          isActive: isActive !== undefined ? isActive : true,
        },
      });

      res.status(201).json({
        message: "Pricing plan created successfully",
        pricingPlan,
      });
    } catch (error: unknown) {
      const e = error as { code?: string };
      if (e.code === "P2002") {
        return res.status(409).json({
          message:
            "Pricing plan with this tier and billing cycle already exists",
        });
      }
      return sendControllerError(req, res, error, "Create pricing plan error");
    }
  }

  /**
   * Update a pricing plan.
   */
  async updatePricingPlan(req: Request, res: Response) {
    try {
      const { tier, billingCycle } = req.params;
      const { price, originalPrice, isActive } = req.body;

      const validTiers = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];
      const validCycles = ["MONTHLY", "ANNUAL"];

      if (!validTiers.includes(tier)) {
        return res.status(400).json({
          message: `tier must be one of: ${validTiers.join(", ")}`,
        });
      }

      if (!validCycles.includes(billingCycle)) {
        return res.status(400).json({
          message: `billingCycle must be one of: ${validCycles.join(", ")}`,
        });
      }

      if (price !== undefined && (typeof price !== "number" || price < 0)) {
        return res.status(400).json({
          message: "price must be a non-negative number",
        });
      }

      const pricingPlan = await basePrisma.pricingPlan.update({
        where: {
          tier_billingCycle: {
            tier: tier as any,
            billingCycle: billingCycle as any,
          },
        },
        data: {
          ...(price !== undefined && { price }),
          ...(originalPrice !== undefined && { originalPrice }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      res.status(200).json({
        message: "Pricing plan updated successfully",
        pricingPlan,
      });
    } catch (error: unknown) {
      const e = error as { code?: string };
      if (e.code === "P2025") {
        return res.status(404).json({ message: "Pricing plan not found" });
      }
      return sendControllerError(req, res, error, "Update pricing plan error");
    }
  }

  /**
   * Delete a pricing plan.
   */
  async deletePricingPlan(req: Request, res: Response) {
    try {
      const { tier, billingCycle } = req.params;

      const validTiers = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];
      const validCycles = ["MONTHLY", "ANNUAL"];

      if (!validTiers.includes(tier)) {
        return res.status(400).json({
          message: `tier must be one of: ${validTiers.join(", ")}`,
        });
      }

      if (!validCycles.includes(billingCycle)) {
        return res.status(400).json({
          message: `billingCycle must be one of: ${validCycles.join(", ")}`,
        });
      }

      await basePrisma.pricingPlan.delete({
        where: {
          tier_billingCycle: {
            tier: tier as any,
            billingCycle: billingCycle as any,
          },
        },
      });

      res.status(200).json({ message: "Pricing plan deleted successfully" });
    } catch (error: unknown) {
      const e = error as { code?: string };
      if (e.code === "P2025") {
        return res.status(404).json({ message: "Pricing plan not found" });
      }
      return sendControllerError(req, res, error, "Delete pricing plan error");
    }
  }

  // ============================================
  // SUBSCRIPTIONS CRUD
  // ============================================

  /**
   * List all subscriptions (optionally filtered by tenant).
   */
  async listSubscriptions(req: Request, res: Response) {
    try {
      const { tenantId } = req.query;

      const subscriptions = await basePrisma.subscription.findMany({
        where: tenantId ? { tenantId: tenantId as string } : undefined,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              payments: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.status(200).json({ subscriptions });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "List subscriptions error");
    }
  }

  /**
   * Get a single subscription.
   */
  async getSubscription(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const subscription = await basePrisma.subscription.findUnique({
        where: { id },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          payments: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });

      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      res.status(200).json({ subscription });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get subscription error");
    }
  }

  /**
   * Create a subscription for a tenant.
   */
  async createSubscription(req: Request, res: Response) {
    try {
      const {
        tenantId,
        plan,
        billingCycle,
        status = "TRIAL",
        currentPeriodStart,
        currentPeriodEnd,
        trialEndsAt,
        gracePeriodEnd,
      } = req.body;

      if (!tenantId || !plan || !billingCycle) {
        return res.status(400).json({
          message: "tenantId, plan, and billingCycle are required",
        });
      }

      const validPlans = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];
      const validCycles = ["MONTHLY", "ANNUAL"];
      const validStatuses = [
        "TRIAL",
        "ACTIVE",
        "PAST_DUE",
        "SUSPENDED",
        "LOCKED",
        "CANCELLED",
      ];

      if (!validPlans.includes(plan)) {
        return res.status(400).json({
          message: `plan must be one of: ${validPlans.join(", ")}`,
        });
      }

      if (!validCycles.includes(billingCycle)) {
        return res.status(400).json({
          message: `billingCycle must be one of: ${validCycles.join(", ")}`,
        });
      }

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message: `status must be one of: ${validStatuses.join(", ")}`,
        });
      }

      // Check if tenant exists
      const tenant = await basePrisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const subscription = await basePrisma.subscription.create({
        data: {
          tenantId,
          plan: plan as any,
          billingCycle: billingCycle as any,
          status: status as any,
          currentPeriodStart: currentPeriodStart
            ? new Date(currentPeriodStart)
            : new Date(),
          currentPeriodEnd: currentPeriodEnd
            ? new Date(currentPeriodEnd)
            : new Date(),
          trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : undefined,
          gracePeriodEnd: gracePeriodEnd ? new Date(gracePeriodEnd) : undefined,
        },
      });

      res.status(201).json({
        message: "Subscription created successfully",
        subscription,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Create subscription error");
    }
  }

  /**
   * Update a subscription.
   */
  async updateSubscription(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        plan,
        billingCycle,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        trialEndsAt,
        gracePeriodEnd,
        cancelledAt,
      } = req.body;

      const validPlans = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];
      const validCycles = ["MONTHLY", "ANNUAL"];
      const validStatuses = [
        "TRIAL",
        "ACTIVE",
        "PAST_DUE",
        "SUSPENDED",
        "LOCKED",
        "CANCELLED",
      ];

      if (plan !== undefined && !validPlans.includes(plan)) {
        return res.status(400).json({
          message: `plan must be one of: ${validPlans.join(", ")}`,
        });
      }

      if (billingCycle !== undefined && !validCycles.includes(billingCycle)) {
        return res.status(400).json({
          message: `billingCycle must be one of: ${validCycles.join(", ")}`,
        });
      }

      if (status !== undefined && !validStatuses.includes(status)) {
        return res.status(400).json({
          message: `status must be one of: ${validStatuses.join(", ")}`,
        });
      }

      const subscription = await basePrisma.subscription.update({
        where: { id },
        data: {
          ...(plan !== undefined && { plan: plan as any }),
          ...(billingCycle !== undefined && {
            billingCycle: billingCycle as any,
          }),
          ...(status !== undefined && { status: status as any }),
          ...(currentPeriodStart !== undefined && {
            currentPeriodStart: new Date(currentPeriodStart),
          }),
          ...(currentPeriodEnd !== undefined && {
            currentPeriodEnd: new Date(currentPeriodEnd),
          }),
          ...(trialEndsAt !== undefined && {
            trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null,
          }),
          ...(gracePeriodEnd !== undefined && {
            gracePeriodEnd: gracePeriodEnd ? new Date(gracePeriodEnd) : null,
          }),
          ...(cancelledAt !== undefined && {
            cancelledAt: cancelledAt ? new Date(cancelledAt) : null,
          }),
        },
      });

      res.status(200).json({
        message: "Subscription updated successfully",
        subscription,
      });
    } catch (error: unknown) {
      const e = error as { code?: string };
      if (e.code === "P2025") {
        return res.status(404).json({ message: "Subscription not found" });
      }
      return sendControllerError(req, res, error, "Update subscription error");
    }
  }

  /**
   * Delete a subscription.
   */
  async deleteSubscription(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await basePrisma.subscription.delete({
        where: { id },
      });

      res.status(200).json({ message: "Subscription deleted successfully" });
    } catch (error: unknown) {
      const e = error as { code?: string };
      if (e.code === "P2025") {
        return res.status(404).json({ message: "Subscription not found" });
      }
      return sendControllerError(req, res, error, "Delete subscription error");
    }
  }

  // ============================================
  // TENANT PAYMENTS CRUD
  // ============================================

  /**
   * List all tenant payments (optionally filtered by tenant or subscription).
   */
  async listTenantPayments(req: Request, res: Response) {
    try {
      const { tenantId, subscriptionId } = req.query;

      const payments = await basePrisma.tenantPayment.findMany({
        where: {
          ...(tenantId && { tenantId: tenantId as string }),
          ...(subscriptionId && { subscriptionId: subscriptionId as string }),
        },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          subscription: {
            select: {
              id: true,
              plan: true,
              billingCycle: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.status(200).json({ payments });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "List tenant payments error");
    }
  }

  /**
   * Get a single tenant payment.
   */
  async getTenantPayment(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const payment = await basePrisma.tenantPayment.findUnique({
        where: { id },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          subscription: {
            select: {
              id: true,
              plan: true,
              billingCycle: true,
              status: true,
            },
          },
        },
      });

      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      res.status(200).json({ payment });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get tenant payment error");
    }
  }

  /**
   * Create a tenant payment.
   */
  async createTenantPayment(req: Request, res: Response) {
    try {
      const {
        tenantId,
        subscriptionId,
        amount,
        currency = "NPR",
        gateway,
        gatewayTxnId,
        gatewayResponse,
        status = "PENDING",
        paidFor,
        billingCycle,
        periodStart,
        periodEnd,
        verifiedAt,
        verifiedBy,
        notes,
      } = req.body;

      if (
        !tenantId ||
        !subscriptionId ||
        amount === undefined ||
        !gateway ||
        !paidFor ||
        !billingCycle ||
        !periodStart ||
        !periodEnd
      ) {
        return res.status(400).json({
          message:
            "tenantId, subscriptionId, amount, gateway, paidFor, billingCycle, periodStart, and periodEnd are required",
        });
      }

      const validGateways = [
        "ESEWA",
        "KHALTI",
        "FONEPAY",
        "CONNECTIPS",
        "BANK_TRANSFER",
        "MANUAL",
      ];
      const validStatuses = ["PENDING", "COMPLETED", "FAILED", "REFUNDED"];
      const validPlans = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];
      const validCycles = ["MONTHLY", "ANNUAL"];

      if (!validGateways.includes(gateway)) {
        return res.status(400).json({
          message: `gateway must be one of: ${validGateways.join(", ")}`,
        });
      }

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message: `status must be one of: ${validStatuses.join(", ")}`,
        });
      }

      if (!validPlans.includes(paidFor)) {
        return res.status(400).json({
          message: `paidFor must be one of: ${validPlans.join(", ")}`,
        });
      }

      if (!validCycles.includes(billingCycle)) {
        return res.status(400).json({
          message: `billingCycle must be one of: ${validCycles.join(", ")}`,
        });
      }

      // Check if tenant and subscription exist
      const [tenant, subscription] = await Promise.all([
        basePrisma.tenant.findUnique({ where: { id: tenantId } }),
        basePrisma.subscription.findUnique({ where: { id: subscriptionId } }),
      ]);

      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      const payment = await basePrisma.tenantPayment.create({
        data: {
          tenantId,
          subscriptionId,
          amount,
          currency,
          gateway: gateway as any,
          gatewayTxnId,
          gatewayResponse,
          status: status as any,
          paidFor: paidFor as any,
          billingCycle: billingCycle as any,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          verifiedAt: verifiedAt ? new Date(verifiedAt) : undefined,
          verifiedBy,
          notes,
        },
      });

      res.status(201).json({
        message: "Payment created successfully",
        payment,
      });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Create tenant payment error",
      );
    }
  }

  /**
   * Update a tenant payment.
   */
  async updateTenantPayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        amount,
        currency,
        gateway,
        gatewayTxnId,
        gatewayResponse,
        status,
        verifiedAt,
        verifiedBy,
        notes,
      } = req.body;

      const validGateways = [
        "ESEWA",
        "KHALTI",
        "FONEPAY",
        "CONNECTIPS",
        "BANK_TRANSFER",
        "MANUAL",
      ];
      const validStatuses = ["PENDING", "COMPLETED", "FAILED", "REFUNDED"];

      if (gateway !== undefined && !validGateways.includes(gateway)) {
        return res.status(400).json({
          message: `gateway must be one of: ${validGateways.join(", ")}`,
        });
      }

      if (status !== undefined && !validStatuses.includes(status)) {
        return res.status(400).json({
          message: `status must be one of: ${validStatuses.join(", ")}`,
        });
      }

      const payment = await basePrisma.tenantPayment.update({
        where: { id },
        data: {
          ...(amount !== undefined && { amount }),
          ...(currency !== undefined && { currency }),
          ...(gateway !== undefined && { gateway: gateway as any }),
          ...(gatewayTxnId !== undefined && { gatewayTxnId }),
          ...(gatewayResponse !== undefined && { gatewayResponse }),
          ...(status !== undefined && { status: status as any }),
          ...(verifiedAt !== undefined && {
            verifiedAt: verifiedAt ? new Date(verifiedAt) : null,
          }),
          ...(verifiedBy !== undefined && { verifiedBy }),
          ...(notes !== undefined && { notes }),
        },
      });

      res.status(200).json({
        message: "Payment updated successfully",
        payment,
      });
    } catch (error: unknown) {
      const e = error as { code?: string };
      if (e.code === "P2025") {
        return res.status(404).json({ message: "Payment not found" });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Update tenant payment error",
      );
    }
  }

  /**
   * Delete a tenant payment.
   */
  async deleteTenantPayment(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await basePrisma.tenantPayment.delete({
        where: { id },
      });

      res.status(200).json({ message: "Payment deleted successfully" });
    } catch (error: unknown) {
      const e = error as { code?: string };
      if (e.code === "P2025") {
        return res.status(404).json({ message: "Payment not found" });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Delete tenant payment error",
      );
    }
  }
}

export default new PlatformController();
