/**
 * Platform Repository — ONLY layer that imports basePrisma.
 * All cross-tenant operations use basePrisma (unscoped).
 */

import { basePrisma } from "@/config/prisma";
import type { PlanTier } from "@prisma/client";
import type { Prisma } from "@prisma/client";

// ─── Tenant ─────────────────────────────────────────────────────────────────

export interface CreateTenantRepoData {
  name: string;
  slug: string;
  plan: PlanTier;
  isTrial: boolean;
  trialEndsAt: Date;
  subscriptionStatus: "TRIAL";
}

export interface CreateTenantWithAdminResult {
  tenant: Awaited<ReturnType<typeof basePrisma.tenant.create>>;
  adminUser: { id: string; username: string; role: string };
}

export interface CreateTenantTransactionInput {
  tenantData: CreateTenantRepoData;
  adminUsername: string;
  adminPasswordHash: string;
  discountTypeNames: string[];
}

export interface UpdateTenantRepoData {
  name?: string;
  slug?: string;
  isActive?: boolean;
  subscriptionStatus?: string;
  isTrial?: boolean;
  trialEndsAt?: Date | null;
  planExpiresAt?: Date | null;
  settings?: unknown;
  customMaxUsers?: number | null;
  customMaxProducts?: number | null;
  customMaxLocations?: number | null;
  customMaxMembers?: number | null;
  customMaxCustomers?: number | null;
}

export class PlatformRepository {
  /** Find tenant by slug. */
  async findBySlug(slug: string) {
    return basePrisma.tenant.findUnique({ where: { slug } });
  }

  /** Find tenant by id. */
  async findTenantById(id: string) {
    return basePrisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true, username: true, role: true },
          orderBy: { createdAt: "asc" as const },
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
        subscriptions: { orderBy: { createdAt: "desc" as const }, take: 5 },
        payments: { orderBy: { createdAt: "desc" as const }, take: 10 },
      },
    });
  }

  /** List all tenants with summary stats. Excludes system tenant. */
  async findAllTenants() {
    return basePrisma.tenant.findMany({
      where: { slug: { not: "system" } },
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
  }

  /** Create tenant + admin user + discount types in transaction. */
  async createTenantWithAdmin(
    input: CreateTenantTransactionInput,
  ): Promise<CreateTenantWithAdminResult> {
    const { tenantData, adminUsername, adminPasswordHash, discountTypeNames } =
      input;
    return basePrisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: tenantData.name,
          slug: tenantData.slug,
          plan: tenantData.plan,
          isTrial: tenantData.isTrial,
          trialEndsAt: tenantData.trialEndsAt,
          subscriptionStatus: tenantData.subscriptionStatus,
        },
      });

      const adminUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          username: adminUsername.toLowerCase().trim(),
          password: adminPasswordHash,
          role: "superAdmin",
        },
      });

      for (const dtName of discountTypeNames) {
        await tx.discountType.create({
          data: { tenantId: tenant.id, name: dtName },
        });
      }

      await tx.location.create({
        data: {
          tenantId: tenant.id,
          name: "Main Location",
          type: "WAREHOUSE",
          isActive: true,
          isDefaultWarehouse: true,
        },
      });

      await tx.category.create({
        data: {
          tenantId: tenant.id,
          name: "Uncategorized",
          description: "Default category",
        },
      });

      // CRM defaults: sources, journey types (pipelines seeded separately via pipelineRepository.seedDefaultPipelines)
      const defaultSources = [
        "Website",
        "Referral",
        "Social Media",
        "Cold Call",
        "Event",
      ];
      for (const name of defaultSources) {
        await tx.crmSource.create({
          data: { tenantId: tenant.id, name },
        });
      }

      const defaultJourneyTypes = ["New", "Returning", "VIP"];
      for (const name of defaultJourneyTypes) {
        await tx.crmJourneyType.create({
          data: { tenantId: tenant.id, name },
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
  }

  /** Update tenant by id. */
  async updateTenant(id: string, data: UpdateTenantRepoData) {
    return basePrisma.tenant.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.subscriptionStatus !== undefined && {
          subscriptionStatus: data.subscriptionStatus as
            | "TRIAL"
            | "ACTIVE"
            | "PAST_DUE"
            | "SUSPENDED"
            | "LOCKED"
            | "CANCELLED",
        }),
        ...(data.isTrial !== undefined && { isTrial: data.isTrial }),
        ...(data.trialEndsAt !== undefined && {
          trialEndsAt: data.trialEndsAt,
        }),
        ...(data.planExpiresAt !== undefined && {
          planExpiresAt: data.planExpiresAt,
        }),
        ...(data.settings !== undefined && {
          settings: data.settings as Prisma.InputJsonValue,
        }),
        ...(data.customMaxUsers !== undefined && {
          customMaxUsers: data.customMaxUsers,
        }),
        ...(data.customMaxProducts !== undefined && {
          customMaxProducts: data.customMaxProducts,
        }),
        ...(data.customMaxLocations !== undefined && {
          customMaxLocations: data.customMaxLocations,
        }),
        ...(data.customMaxMembers !== undefined && {
          customMaxMembers: data.customMaxMembers,
        }),
        ...(data.customMaxCustomers !== undefined && {
          customMaxCustomers: data.customMaxCustomers,
        }),
      },
    });
  }

  /** Change tenant plan. */
  async changeTenantPlan(
    id: string,
    plan: PlanTier,
    planExpiresAt?: Date | null,
  ) {
    return basePrisma.tenant.update({
      where: { id },
      data: {
        plan,
        isTrial: false,
        subscriptionStatus: "ACTIVE",
        ...(planExpiresAt !== undefined && { planExpiresAt }),
      },
    });
  }

  /** Deactivate tenant (soft: isActive=false, subscriptionStatus=CANCELLED). */
  async deactivateTenant(id: string) {
    return basePrisma.tenant.update({
      where: { id },
      data: { isActive: false, subscriptionStatus: "CANCELLED" },
    });
  }

  /** Activate tenant. */
  async activateTenant(id: string, previousStatus: string) {
    return basePrisma.tenant.update({
      where: { id },
      data: {
        isActive: true,
        subscriptionStatus:
          previousStatus === "CANCELLED"
            ? "ACTIVE"
            : (previousStatus as
                | "TRIAL"
                | "ACTIVE"
                | "PAST_DUE"
                | "SUSPENDED"
                | "LOCKED"),
      },
    });
  }

  // ─── User (reset password, create) ─────────────────────────────────────────

  async findUserById(userId: string) {
    return basePrisma.user.findUnique({ where: { id: userId } });
  }

  async findUserByTenantAndUsername(tenantId: string, username: string) {
    return basePrisma.user.findFirst({
      where: { tenantId, username: username.toLowerCase().trim() },
    });
  }

  async createUserForTenant(
    tenantId: string,
    data: {
      username: string;
      hashedPassword: string;
      role: "admin" | "user" | "superAdmin";
    },
  ) {
    return basePrisma.user.create({
      data: {
        tenantId,
        username: data.username,
        password: data.hashedPassword,
        role: data.role,
      },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateUserPassword(userId: string, hashedPassword: string) {
    return basePrisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  // ─── Stats ─────────────────────────────────────────────────────────────────

  async getStats() {
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
      basePrisma.tenant.count({ where: { subscriptionStatus: "TRIAL" } }),
      basePrisma.user.count(),
      basePrisma.sale.count(),
      basePrisma.tenant.groupBy({
        by: ["plan"],
        _count: true,
        where: { isActive: true },
      }),
    ]);
    return {
      totalTenants,
      activeTenants,
      trialTenants,
      totalUsers,
      totalSales,
      planDistribution: planDistribution.map((p) => ({
        plan: p.plan,
        count: p._count,
      })),
    };
  }

  // ─── Plan Limits ───────────────────────────────────────────────────────────

  async findAllPlanLimits() {
    return basePrisma.planLimit.findMany({ orderBy: { tier: "asc" } });
  }

  async findPlanLimitByTier(tier: string) {
    return basePrisma.planLimit.findUnique({
      where: { tier: tier as PlanTier },
    });
  }

  async upsertPlanLimit(data: {
    tier: PlanTier;
    maxUsers?: number;
    maxProducts?: number;
    maxLocations?: number;
    maxMembers?: number;
    maxCustomers?: number;
    bulkUpload?: boolean;
    analytics?: boolean;
    promoManagement?: boolean;
    auditLogs?: boolean;
    apiAccess?: boolean;
    salesPipeline?: boolean;
  }) {
    return basePrisma.planLimit.upsert({
      where: { tier: data.tier },
      update: {
        ...(data.maxUsers !== undefined && { maxUsers: data.maxUsers }),
        ...(data.maxProducts !== undefined && {
          maxProducts: data.maxProducts,
        }),
        ...(data.maxLocations !== undefined && {
          maxLocations: data.maxLocations,
        }),
        ...(data.maxMembers !== undefined && { maxMembers: data.maxMembers }),
        ...(data.maxCustomers !== undefined && {
          maxCustomers: data.maxCustomers,
        }),
        ...(data.bulkUpload !== undefined && { bulkUpload: data.bulkUpload }),
        ...(data.analytics !== undefined && { analytics: data.analytics }),
        ...(data.promoManagement !== undefined && {
          promoManagement: data.promoManagement,
        }),
        ...(data.auditLogs !== undefined && { auditLogs: data.auditLogs }),
        ...(data.apiAccess !== undefined && { apiAccess: data.apiAccess }),
        ...(data.salesPipeline !== undefined && {
          salesPipeline: data.salesPipeline,
        }),
      },
      create: {
        tier: data.tier,
        maxUsers: data.maxUsers ?? 5,
        maxProducts: data.maxProducts ?? 100,
        maxLocations: data.maxLocations ?? 2,
        maxMembers: data.maxMembers ?? 50,
        maxCustomers: data.maxCustomers ?? 100,
        bulkUpload: data.bulkUpload ?? false,
        analytics: data.analytics ?? false,
        promoManagement: data.promoManagement ?? false,
        auditLogs: data.auditLogs ?? false,
        apiAccess: data.apiAccess ?? false,
        salesPipeline: data.salesPipeline ?? false,
      },
    });
  }

  async deletePlanLimit(tier: string) {
    return basePrisma.planLimit.delete({
      where: { tier: tier as PlanTier },
    });
  }

  // ─── Pricing Plans ─────────────────────────────────────────────────────────

  async findAllPricingPlans() {
    return basePrisma.pricingPlan.findMany({
      orderBy: [{ tier: "asc" }, { billingCycle: "asc" }],
    });
  }

  async findPricingPlanByTierAndCycle(tier: string, billingCycle: string) {
    return basePrisma.pricingPlan.findUnique({
      where: {
        tier_billingCycle: {
          tier: tier as PlanTier,
          billingCycle: billingCycle as "MONTHLY" | "ANNUAL",
        },
      },
    });
  }

  async createPricingPlan(data: {
    tier: PlanTier;
    billingCycle: "MONTHLY" | "ANNUAL";
    price: number;
    originalPrice?: number | null;
    isActive?: boolean;
  }) {
    return basePrisma.pricingPlan.create({
      data: {
        tier: data.tier,
        billingCycle: data.billingCycle,
        price: data.price,
        originalPrice: data.originalPrice ?? undefined,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updatePricingPlan(
    tier: string,
    billingCycle: string,
    data: { price?: number; originalPrice?: number | null; isActive?: boolean },
  ) {
    return basePrisma.pricingPlan.update({
      where: {
        tier_billingCycle: {
          tier: tier as PlanTier,
          billingCycle: billingCycle as "MONTHLY" | "ANNUAL",
        },
      },
      data: {
        ...(data.price !== undefined && { price: data.price }),
        ...(data.originalPrice !== undefined && {
          originalPrice: data.originalPrice,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async deletePricingPlan(tier: string, billingCycle: string) {
    return basePrisma.pricingPlan.delete({
      where: {
        tier_billingCycle: {
          tier: tier as PlanTier,
          billingCycle: billingCycle as "MONTHLY" | "ANNUAL",
        },
      },
    });
  }

  // ─── Subscriptions ─────────────────────────────────────────────────────────

  async findAllSubscriptions(tenantId?: string) {
    return basePrisma.subscription.findMany({
      where: tenantId ? { tenantId } : undefined,
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        _count: { select: { payments: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findSubscriptionById(id: string) {
    return basePrisma.subscription.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        payments: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
  }

  async createSubscription(data: {
    tenantId: string;
    plan: PlanTier;
    billingCycle: "MONTHLY" | "ANNUAL";
    status?:
      | "TRIAL"
      | "ACTIVE"
      | "PAST_DUE"
      | "SUSPENDED"
      | "LOCKED"
      | "CANCELLED";
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    trialEndsAt?: Date | null;
    gracePeriodEnd?: Date | null;
  }) {
    return basePrisma.subscription.create({
      data: {
        tenantId: data.tenantId,
        plan: data.plan,
        billingCycle: data.billingCycle,
        status: (data.status ?? "TRIAL") as
          | "TRIAL"
          | "ACTIVE"
          | "PAST_DUE"
          | "SUSPENDED"
          | "LOCKED"
          | "CANCELLED",
        currentPeriodStart: data.currentPeriodStart ?? new Date(),
        currentPeriodEnd: data.currentPeriodEnd ?? new Date(),
        trialEndsAt: data.trialEndsAt ?? undefined,
        gracePeriodEnd: data.gracePeriodEnd ?? undefined,
      },
    });
  }

  async updateSubscription(
    id: string,
    data: {
      plan?: PlanTier;
      billingCycle?: "MONTHLY" | "ANNUAL";
      status?:
        | "TRIAL"
        | "ACTIVE"
        | "PAST_DUE"
        | "SUSPENDED"
        | "LOCKED"
        | "CANCELLED";
      currentPeriodStart?: Date;
      currentPeriodEnd?: Date;
      trialEndsAt?: Date | null;
      gracePeriodEnd?: Date | null;
      cancelledAt?: Date | null;
    },
  ) {
    return basePrisma.subscription.update({
      where: { id },
      data: {
        ...(data.plan !== undefined && { plan: data.plan }),
        ...(data.billingCycle !== undefined && {
          billingCycle: data.billingCycle,
        }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.currentPeriodStart !== undefined && {
          currentPeriodStart: data.currentPeriodStart,
        }),
        ...(data.currentPeriodEnd !== undefined && {
          currentPeriodEnd: data.currentPeriodEnd,
        }),
        ...(data.trialEndsAt !== undefined && {
          trialEndsAt: data.trialEndsAt,
        }),
        ...(data.gracePeriodEnd !== undefined && {
          gracePeriodEnd: data.gracePeriodEnd,
        }),
        ...(data.cancelledAt !== undefined && {
          cancelledAt: data.cancelledAt,
        }),
      },
    });
  }

  async deleteSubscription(id: string) {
    return basePrisma.subscription.delete({ where: { id } });
  }

  // ─── Tenant Payments ───────────────────────────────────────────────────────

  async findAllTenantPayments(tenantId?: string, subscriptionId?: string) {
    return basePrisma.tenantPayment.findMany({
      where: {
        ...(tenantId && { tenantId }),
        ...(subscriptionId && { subscriptionId }),
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        subscription: {
          select: { id: true, plan: true, billingCycle: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findTenantPaymentById(id: string) {
    return basePrisma.tenantPayment.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        subscription: {
          select: { id: true, plan: true, billingCycle: true, status: true },
        },
      },
    });
  }

  async createTenantPayment(data: {
    tenantId: string;
    subscriptionId: string;
    amount: number;
    currency?: string;
    gateway: string;
    gatewayTxnId?: string | null;
    gatewayResponse?: unknown;
    status?: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
    paidFor: PlanTier;
    billingCycle: "MONTHLY" | "ANNUAL";
    periodStart: Date;
    periodEnd: Date;
    verifiedAt?: Date | null;
    verifiedBy?: string | null;
    notes?: string | null;
  }) {
    return basePrisma.tenantPayment.create({
      data: {
        tenantId: data.tenantId,
        subscriptionId: data.subscriptionId,
        amount: data.amount,
        currency: data.currency ?? "NPR",
        gateway: data.gateway as
          | "ESEWA"
          | "KHALTI"
          | "FONEPAY"
          | "CONNECTIPS"
          | "BANK_TRANSFER"
          | "MANUAL",
        gatewayTxnId: data.gatewayTxnId ?? undefined,
        gatewayResponse: data.gatewayResponse as
          | Prisma.InputJsonValue
          | undefined,
        status: (data.status ?? "PENDING") as
          | "PENDING"
          | "COMPLETED"
          | "FAILED"
          | "REFUNDED",
        paidFor: data.paidFor,
        billingCycle: data.billingCycle,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        verifiedAt: data.verifiedAt ?? undefined,
        verifiedBy: data.verifiedBy ?? undefined,
        notes: data.notes ?? undefined,
      },
    });
  }

  async updateTenantPayment(
    id: string,
    data: {
      amount?: number;
      currency?: string;
      gateway?: string;
      gatewayTxnId?: string | null;
      gatewayResponse?: unknown;
      status?: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
      verifiedAt?: Date | null;
      verifiedBy?: string | null;
      notes?: string | null;
    },
  ) {
    return basePrisma.tenantPayment.update({
      where: { id },
      data: {
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.gateway !== undefined && {
          gateway: data.gateway as
            | "ESEWA"
            | "KHALTI"
            | "FONEPAY"
            | "CONNECTIPS"
            | "BANK_TRANSFER"
            | "MANUAL",
        }),
        ...(data.gatewayTxnId !== undefined && {
          gatewayTxnId: data.gatewayTxnId,
        }),
        ...(data.gatewayResponse !== undefined && {
          gatewayResponse: data.gatewayResponse as Prisma.InputJsonValue,
        }),
        ...(data.status !== undefined && {
          status: data.status as
            | "PENDING"
            | "COMPLETED"
            | "FAILED"
            | "REFUNDED",
        }),
        ...(data.verifiedAt !== undefined && { verifiedAt: data.verifiedAt }),
        ...(data.verifiedBy !== undefined && { verifiedBy: data.verifiedBy }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
  }

  async deleteTenantPayment(id: string) {
    return basePrisma.tenantPayment.delete({ where: { id } });
  }
}

export default new PlatformRepository();
