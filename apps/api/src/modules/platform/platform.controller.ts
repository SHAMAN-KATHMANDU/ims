/**
 * Platform Controller — Tenant CRUD for platform administrators.
 *
 * All operations here use basePrisma (unscoped) because platform admins
 * operate across tenants.
 */

import { Request, Response } from "express";
import { basePrisma } from "@/config/prisma";
import bcrypt from "bcryptjs";
import { logger } from "@/config/logger";

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
    } catch (error) {
      logger.error("Create tenant error", undefined, error);
      res.status(500).json({ message: "Internal server error" });
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
    } catch (error) {
      logger.error("List tenants error", undefined, error);
      res.status(500).json({ message: "Internal server error" });
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
    } catch (error) {
      logger.error("Get tenant error", undefined, error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Update a tenant's details.
   */
  async updateTenant(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, isActive, settings } = req.body;

      const tenant = await basePrisma.tenant.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(isActive !== undefined && { isActive }),
          ...(settings !== undefined && { settings }),
        },
      });

      res.status(200).json({ tenant });
    } catch (error) {
      logger.error("Update tenant error", undefined, error);
      res.status(500).json({ message: "Internal server error" });
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
    } catch (error) {
      logger.error("Change plan error", undefined, error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Deactivate (soft-delete) a tenant.
   */
  async deactivateTenant(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const tenant = await basePrisma.tenant.update({
        where: { id },
        data: {
          isActive: false,
          subscriptionStatus: "CANCELLED",
        },
      });

      res.status(200).json({
        message: "Tenant deactivated",
        tenant,
      });
    } catch (error) {
      logger.error("Deactivate tenant error", undefined, error);
      res.status(500).json({ message: "Internal server error" });
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
    } catch (error) {
      logger.error("Platform stats error", undefined, error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
}

export default new PlatformController();
