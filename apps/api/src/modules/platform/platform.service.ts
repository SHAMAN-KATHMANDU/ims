/**
 * Platform Service — Business logic for cross-tenant operations.
 * No req/res, no Prisma. Calls repository and applies business rules.
 */

import bcrypt from "bcryptjs";
import { DEFAULT_PLAN_LIMITS, PlanTier } from "@repo/shared";
import platformRepository, {
  type PlatformRepository,
  type CreateTenantRepoData,
  type CreateTenantWithAdminResult,
  type UpdateTenantRepoData,
} from "./platform.repository";
import type {
  CreateTenantDto,
  UpdateTenantDto,
  CreateTenantUserDto,
  ResetTenantUserPasswordDto,
  ChangePlanDto,
  UpsertPlanLimitDto,
  CreatePricingPlanDto,
  UpdatePricingPlanDto,
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CreateTenantPaymentDto,
  UpdateTenantPaymentDto,
} from "./platform.schema";

const DEFAULT_DISCOUNT_TYPES = ["Non-Member", "Member", "Wholesale", "Special"];
const BCRYPT_ROUNDS = 10;

export class PlatformService {
  constructor(private repo: PlatformRepository) {}

  async createTenant(
    data: CreateTenantDto,
  ): Promise<CreateTenantWithAdminResult> {
    const existing = await this.repo.findBySlug(data.slug);
    if (existing) {
      throw Object.assign(
        new Error(`Tenant with slug "${data.slug}" already exists`),
        {
          statusCode: 409,
        },
      );
    }

    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const hashedPassword = await bcrypt.hash(data.adminPassword, BCRYPT_ROUNDS);

    const tenantData: CreateTenantRepoData = {
      name: data.name,
      slug: data.slug,
      plan: data.plan as PlanTier,
      isTrial: true,
      trialEndsAt,
      subscriptionStatus: "TRIAL",
    };

    return this.repo.createTenantWithAdmin({
      tenantData,
      adminUsername: data.adminUsername,
      adminPasswordHash: hashedPassword,
      discountTypeNames: DEFAULT_DISCOUNT_TYPES,
    });
  }

  async findAllTenants() {
    return this.repo.findAllTenants();
  }

  async findTenantById(id: string) {
    return this.repo.findTenantById(id);
  }

  async createTenantUser(
    tenantId: string,
    data: CreateTenantUserDto,
  ): Promise<{
    id: string;
    username: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const tenant = await this.repo.findTenantById(tenantId);
    if (!tenant) {
      throw Object.assign(new Error("Tenant not found"), { statusCode: 404 });
    }

    let limits = DEFAULT_PLAN_LIMITS[(tenant.plan as PlanTier) ?? "STARTER"];
    try {
      const planLimitRow = await this.repo.findPlanLimitByTier(tenant.plan);
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
        };
      }
    } catch {
      limits = DEFAULT_PLAN_LIMITS[(tenant.plan as PlanTier) ?? "STARTER"];
    }

    let maxUsers = limits.maxUsers;
    const tenantOverride = tenant.customMaxUsers;
    if (tenantOverride !== undefined && tenantOverride !== null) {
      maxUsers = tenantOverride;
    }
    const currentCount = tenant._count?.users ?? 0;
    if (maxUsers !== -1 && currentCount >= maxUsers) {
      throw Object.assign(
        new Error("Tenant has reached the user limit for their plan."),
        { statusCode: 403 },
      );
    }

    const existing = await this.repo.findUserByTenantAndUsername(
      tenantId,
      data.username,
    );
    if (existing) {
      throw Object.assign(new Error("User with this username already exists"), {
        statusCode: 409,
      });
    }

    const hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    return this.repo.createUserForTenant(tenantId, {
      username: data.username,
      hashedPassword,
      role: data.role,
    });
  }

  async resetTenantUserPassword(
    tenantId: string,
    userId: string,
    data: ResetTenantUserPasswordDto,
  ): Promise<void> {
    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw Object.assign(new Error("User not found"), { statusCode: 404 });
    }
    if (user.tenantId !== tenantId) {
      throw Object.assign(new Error("User does not belong to this tenant"), {
        statusCode: 403,
      });
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, BCRYPT_ROUNDS);
    await this.repo.updateUserPassword(userId, hashedPassword);
  }

  async updateTenant(id: string, data: UpdateTenantDto) {
    const existing = await this.repo.findTenantById(id);
    if (!existing) {
      throw Object.assign(new Error("Tenant not found"), { statusCode: 404 });
    }

    if (data.slug !== undefined && data.slug !== existing.slug) {
      const slugExists = await this.repo.findBySlug(data.slug);
      if (slugExists) {
        throw Object.assign(
          new Error(`Tenant with slug "${data.slug}" already exists`),
          {
            statusCode: 409,
          },
        );
      }
    }

    const repoData: UpdateTenantRepoData = {};
    if (data.name !== undefined) repoData.name = data.name;
    if (data.slug !== undefined) repoData.slug = data.slug;
    if (data.isActive !== undefined) repoData.isActive = data.isActive;
    if (data.subscriptionStatus !== undefined)
      repoData.subscriptionStatus = data.subscriptionStatus;
    if (data.isTrial !== undefined) repoData.isTrial = data.isTrial;
    if (data.trialEndsAt !== undefined)
      repoData.trialEndsAt = data.trialEndsAt ?? null;
    if (data.planExpiresAt !== undefined)
      repoData.planExpiresAt = data.planExpiresAt ?? null;
    if (data.settings !== undefined) repoData.settings = data.settings;
    if (data.customMaxUsers !== undefined)
      repoData.customMaxUsers = data.customMaxUsers ?? null;
    if (data.customMaxProducts !== undefined)
      repoData.customMaxProducts = data.customMaxProducts ?? null;
    if (data.customMaxLocations !== undefined)
      repoData.customMaxLocations = data.customMaxLocations ?? null;
    if (data.customMaxMembers !== undefined)
      repoData.customMaxMembers = data.customMaxMembers ?? null;
    if (data.customMaxCustomers !== undefined)
      repoData.customMaxCustomers = data.customMaxCustomers ?? null;

    return this.repo.updateTenant(id, repoData);
  }

  async changePlan(id: string, data: ChangePlanDto) {
    const existing = await this.repo.findTenantById(id);
    if (!existing) {
      throw Object.assign(new Error("Tenant not found"), { statusCode: 404 });
    }
    return this.repo.changeTenantPlan(
      id,
      data.plan as PlanTier,
      data.expiresAt ?? undefined,
    );
  }

  async deactivateTenant(id: string) {
    const existing = await this.repo.findTenantById(id);
    if (!existing) {
      throw Object.assign(new Error("Tenant not found"), { statusCode: 404 });
    }
    return this.repo.deactivateTenant(id);
  }

  async activateTenant(id: string) {
    const existing = await this.repo.findTenantById(id);
    if (!existing) {
      throw Object.assign(new Error("Tenant not found"), { statusCode: 404 });
    }
    return this.repo.activateTenant(id, existing.subscriptionStatus);
  }

  async getStats() {
    return this.repo.getStats();
  }

  // ─── Plan Limits ───────────────────────────────────────────────────────────

  async listPlanLimits() {
    const rows = await this.repo.findAllPlanLimits();
    const byTier = new Map(rows.map((r) => [r.tier as PlanTier, r]));
    const tiers: PlanTier[] = [
      PlanTier.STARTER,
      PlanTier.PROFESSIONAL,
      PlanTier.ENTERPRISE,
    ];

    return tiers.map((tier) => {
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
  }

  async getPlanLimitByTier(tier: string) {
    return this.repo.findPlanLimitByTier(tier);
  }

  async upsertPlanLimit(data: UpsertPlanLimitDto) {
    return this.repo.upsertPlanLimit({
      tier: data.tier as PlanTier,
      ...data,
    });
  }

  async deletePlanLimit(tier: string) {
    return this.repo.deletePlanLimit(tier);
  }

  // ─── Pricing Plans ─────────────────────────────────────────────────────────

  async listPricingPlans() {
    return this.repo.findAllPricingPlans();
  }

  async getPricingPlanByTierAndCycle(tier: string, billingCycle: string) {
    return this.repo.findPricingPlanByTierAndCycle(tier, billingCycle);
  }

  async createPricingPlan(data: CreatePricingPlanDto) {
    return this.repo.createPricingPlan({
      tier: data.tier as PlanTier,
      billingCycle: data.billingCycle,
      price: data.price,
      originalPrice: data.originalPrice ?? undefined,
      isActive: data.isActive ?? true,
    });
  }

  async updatePricingPlan(
    tier: string,
    billingCycle: string,
    data: UpdatePricingPlanDto,
  ) {
    return this.repo.updatePricingPlan(tier, billingCycle, {
      price: data.price,
      originalPrice: data.originalPrice,
      isActive: data.isActive,
    });
  }

  async deletePricingPlan(tier: string, billingCycle: string) {
    return this.repo.deletePricingPlan(tier, billingCycle);
  }

  // ─── Subscriptions ─────────────────────────────────────────────────────────

  async listSubscriptions(tenantId?: string) {
    return this.repo.findAllSubscriptions(tenantId);
  }

  async getSubscriptionById(id: string) {
    return this.repo.findSubscriptionById(id);
  }

  async createSubscription(data: CreateSubscriptionDto) {
    const tenant = await this.repo.findTenantById(data.tenantId);
    if (!tenant) {
      throw Object.assign(new Error("Tenant not found"), { statusCode: 404 });
    }
    return this.repo.createSubscription({
      tenantId: data.tenantId,
      plan: data.plan as PlanTier,
      billingCycle: data.billingCycle,
      status: data.status,
      currentPeriodStart: data.currentPeriodStart,
      currentPeriodEnd: data.currentPeriodEnd,
      trialEndsAt: data.trialEndsAt ?? undefined,
      gracePeriodEnd: data.gracePeriodEnd ?? undefined,
    });
  }

  async updateSubscription(id: string, data: UpdateSubscriptionDto) {
    return this.repo.updateSubscription(id, {
      plan: data.plan as PlanTier | undefined,
      billingCycle: data.billingCycle,
      status: data.status,
      currentPeriodStart: data.currentPeriodStart,
      currentPeriodEnd: data.currentPeriodEnd,
      trialEndsAt: data.trialEndsAt ?? undefined,
      gracePeriodEnd: data.gracePeriodEnd ?? undefined,
      cancelledAt: data.cancelledAt ?? undefined,
    });
  }

  async deleteSubscription(id: string) {
    return this.repo.deleteSubscription(id);
  }

  // ─── Tenant Payments ───────────────────────────────────────────────────────

  async listTenantPayments(tenantId?: string, subscriptionId?: string) {
    return this.repo.findAllTenantPayments(tenantId, subscriptionId);
  }

  async getTenantPaymentById(id: string) {
    return this.repo.findTenantPaymentById(id);
  }

  async createTenantPayment(data: CreateTenantPaymentDto) {
    const [tenant, subscription] = await Promise.all([
      this.repo.findTenantById(data.tenantId),
      this.repo.findSubscriptionById(data.subscriptionId),
    ]);
    if (!tenant) {
      throw Object.assign(new Error("Tenant not found"), { statusCode: 404 });
    }
    if (!subscription) {
      throw Object.assign(new Error("Subscription not found"), {
        statusCode: 404,
      });
    }
    return this.repo.createTenantPayment({
      tenantId: data.tenantId,
      subscriptionId: data.subscriptionId,
      amount: data.amount,
      currency: data.currency,
      gateway: data.gateway,
      gatewayTxnId: data.gatewayTxnId,
      gatewayResponse: data.gatewayResponse,
      status: data.status,
      paidFor: data.paidFor as PlanTier,
      billingCycle: data.billingCycle,
      periodStart:
        data.periodStart instanceof Date
          ? data.periodStart
          : new Date(data.periodStart as string),
      periodEnd:
        data.periodEnd instanceof Date
          ? data.periodEnd
          : new Date(data.periodEnd as string),
      verifiedAt: data.verifiedAt ?? undefined,
      verifiedBy: data.verifiedBy,
      notes: data.notes,
    });
  }

  async updateTenantPayment(id: string, data: UpdateTenantPaymentDto) {
    return this.repo.updateTenantPayment(id, {
      amount: data.amount,
      currency: data.currency,
      gateway: data.gateway,
      gatewayTxnId: data.gatewayTxnId,
      gatewayResponse: data.gatewayResponse,
      status: data.status,
      verifiedAt: data.verifiedAt ?? undefined,
      verifiedBy: data.verifiedBy ?? undefined,
      notes: data.notes ?? undefined,
    });
  }

  async deleteTenantPayment(id: string) {
    return this.repo.deleteTenantPayment(id);
  }
}

export default new PlatformService(platformRepository);
