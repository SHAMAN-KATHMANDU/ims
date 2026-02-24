/**
 * Platform service: business logic for platform admin (tenants, plans, subscriptions, etc.).
 * Uses platform.repository only; no Prisma in this file.
 */

import bcrypt from "bcryptjs";
import { NotFoundError, DomainError, AppError } from "@/shared/errors";
import * as repo from "./platform.repository";

const TRIAL_DAYS = 14;

export type CreateTenantInput = {
  name: string;
  slug: string;
  plan?: string;
  adminUsername: string;
  adminPassword: string;
};

export type CreateTenantResult = Awaited<
  ReturnType<typeof repo.createTenantWithAdminAndDiscountTypes>
>;

export async function createTenant(
  input: CreateTenantInput,
): Promise<CreateTenantResult> {
  const existing = await repo.findTenantBySlug(input.slug);
  if (existing) {
    throw new AppError(
      `Tenant with slug "${input.slug}" already exists`,
      409,
      "SLUG_EXISTS",
    );
  }
  const plan = input.plan ?? "STARTER";
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const hashedPassword = await bcrypt.hash(input.adminPassword, 10);
  const result = (await repo.runTransaction((tx) =>
    repo.createTenantWithAdminAndDiscountTypes(tx, {
      name: input.name,
      slug: input.slug,
      plan,
      trialEndsAt,
      adminUsername: input.adminUsername.toLowerCase().trim(),
      hashedPassword,
    }),
  )) as unknown as CreateTenantResult;
  return result;
}

export async function listTenants() {
  return repo.findTenantsWithCounts();
}

export async function getTenant(id: string) {
  const tenant = await repo.findTenantByIdWithUsersAndCounts(id);
  if (!tenant) throw new NotFoundError("Tenant not found");
  return tenant;
}

export type ResetPasswordInput = { newPassword: string };

export async function resetTenantUserPassword(
  tenantId: string,
  userId: string,
  input: ResetPasswordInput,
) {
  const user = await repo.findUserById(userId);
  if (!user) throw new NotFoundError("User not found");
  if (user.tenantId !== tenantId) {
    throw new AppError("User does not belong to this tenant", 403, "FORBIDDEN");
  }
  const hashedPassword = await bcrypt.hash(input.newPassword, 10);
  await repo.updateUserPassword(userId, hashedPassword);
}

export async function updateTenant(id: string, data: Record<string, unknown>) {
  const existing = await repo.findTenantById(id);
  if (!existing) throw new NotFoundError("Tenant not found");
  if (data.slug !== undefined && data.slug !== existing.slug) {
    const slugExists = await repo.findTenantBySlug(data.slug as string);
    if (slugExists) {
      throw new AppError(
        `Tenant with slug "${data.slug}" already exists`,
        409,
        "SLUG_EXISTS",
      );
    }
  }
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.subscriptionStatus !== undefined)
    updateData.subscriptionStatus = data.subscriptionStatus;
  if (data.isTrial !== undefined) updateData.isTrial = data.isTrial;
  if (data.trialEndsAt !== undefined)
    updateData.trialEndsAt = data.trialEndsAt ?? null;
  if (data.planExpiresAt !== undefined)
    updateData.planExpiresAt = data.planExpiresAt ?? null;
  if (data.settings !== undefined) updateData.settings = data.settings;
  return repo.updateTenant(id, updateData as any);
}

export async function changePlan(
  id: string,
  data: { plan: string; expiresAt?: Date | null },
) {
  return repo.updateTenantPlan(id, {
    plan: data.plan,
    isTrial: false,
    subscriptionStatus: "ACTIVE",
    planExpiresAt: data.expiresAt ?? undefined,
  });
}

export async function deactivateTenant(id: string) {
  const tenant = await repo.findTenantById(id);
  if (!tenant) throw new NotFoundError("Tenant not found");
  return repo.updateTenant(id, {
    isActive: false,
    subscriptionStatus: "CANCELLED",
  });
}

export async function activateTenant(id: string) {
  const tenant = await repo.findTenantById(id);
  if (!tenant) throw new NotFoundError("Tenant not found");
  return repo.updateTenant(id, {
    isActive: true,
    subscriptionStatus:
      tenant.subscriptionStatus === "CANCELLED"
        ? "ACTIVE"
        : tenant.subscriptionStatus,
  });
}

export async function getStats() {
  const [
    totalTenants,
    activeTenants,
    trialTenants,
    totalUsers,
    totalSales,
    planDistribution,
  ] = await Promise.all([
    repo.countTenants(),
    repo.countTenants({ isActive: true }),
    repo.countTenants({ subscriptionStatus: "TRIAL" }),
    repo.countUsers(),
    repo.countSales(),
    repo.groupTenantsByPlan({ isActive: true }),
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

export async function getAnalytics() {
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [
    totalRevenue,
    pendingPayments,
    completedPayments,
    failedPayments,
    activeSubscriptions,
    trialTenants,
    suspendedTenants,
    cancelledTenants,
    planDistribution,
    gatewayBreakdown,
    recentPayments,
    monthlyRevenue,
    tenantGrowth,
    plans,
  ] = await Promise.all([
    repo.aggregateTenantPaymentSum({ status: "COMPLETED" }),
    repo.countTenantPaymentsByStatus("PENDING"),
    repo.countTenantPaymentsByStatus("COMPLETED"),
    repo.countTenantPaymentsByStatus("FAILED"),
    repo.countSubscriptionsByStatus("ACTIVE"),
    repo.countTenants({ subscriptionStatus: "TRIAL" }),
    repo.countTenants({ subscriptionStatus: "SUSPENDED" }),
    repo.countTenants({ subscriptionStatus: "CANCELLED" }),
    repo.groupTenantsByPlan({ isActive: true }),
    repo.groupTenantPaymentsByGateway({ status: "COMPLETED" }),
    repo.findTenantPaymentsRecent(10),
    repo.rawMonthlyRevenue(sixMonthsAgo),
    repo.rawTenantGrowth(sixMonthsAgo),
    repo.findPlans(),
  ]);

  return {
    revenue: {
      total: totalRevenue._sum?.amount ?? 0,
      monthly: monthlyRevenue.map((m) => ({
        month: m.month,
        revenue: Number(m.revenue),
        count: Number(m.count),
      })),
    },
    payments: {
      pending: pendingPayments,
      completed: completedPayments,
      failed: failedPayments,
      byGateway: gatewayBreakdown.map((g) => ({
        gateway: g.gateway,
        count: g._count,
        total: g._sum?.amount ?? 0,
      })),
      recent: recentPayments,
    },
    subscriptions: {
      active: activeSubscriptions,
      trial: trialTenants,
      suspended: suspendedTenants,
      cancelled: cancelledTenants,
    },
    tenants: {
      growth: tenantGrowth.map((t) => ({
        month: t.month,
        count: Number(t.count),
      })),
      planDistribution: planDistribution.map((p) => ({
        plan: p.plan,
        count: p._count,
      })),
    },
    plans,
  };
}

export async function getTenantDetail(id: string) {
  const tenant = await repo.findTenantDetail(id);
  if (!tenant) throw new NotFoundError("Tenant not found");
  const contactCount = await repo.countContactsByTenantOwner(id);
  return {
    tenant: {
      ...tenant,
      _count: { ...tenant._count, contacts: contactCount },
    },
  };
}

export async function checkSubscriptionExpiry() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const expiredActive = await repo.updateSubscriptionsToPastDue({
    status: "ACTIVE",
    currentPeriodEnd: { lt: now },
    gracePeriodEnd: { gte: now },
  });

  const suspendedPastDue = await repo.updateSubscriptionsToSuspended({
    status: "PAST_DUE",
    OR: [
      { gracePeriodEnd: { lt: now } },
      {
        gracePeriodEnd: null,
        currentPeriodEnd: { lt: sevenDaysAgo },
      },
    ],
  });

  const expiredTrials = await repo.updateSubscriptionsToSuspended({
    status: "TRIAL",
    trialEndsAt: { lt: now },
  });

  const subs = await repo.findSubscriptionsWithStatus([
    "PAST_DUE",
    "SUSPENDED",
  ]);
  for (const sub of subs) {
    await repo.updateTenantSubscriptionStatus(sub.tenantId, sub.status);
  }

  return {
    updated: {
      activeToPastDue: expiredActive.count,
      pastDueToSuspended: suspendedPastDue.count,
      trialToSuspended: expiredTrials.count,
    },
  };
}

// Plans
export async function listPlans() {
  return repo.findPlans();
}

export async function getPlan(id: string) {
  const plan = await repo.findPlanById(id);
  if (!plan) throw new NotFoundError("Plan not found");
  return plan;
}

export async function createPlan(data: Record<string, unknown>) {
  return repo.createPlan(data as any);
}

export async function updatePlan(id: string, data: Record<string, unknown>) {
  return repo.updatePlan(id, data as any);
}

export async function deletePlan(id: string) {
  const plan = await repo.findPlanById(id);
  if (!plan) throw new NotFoundError("Plan not found");
  const tenantCount = await repo.countTenantsByPlanTier(plan.tier);
  if (tenantCount > 0) {
    throw new DomainError(
      400,
      `Cannot delete plan "${plan.name}" — ${tenantCount} tenant(s) are currently on this plan. Deactivate it instead.`,
      "PLAN_IN_USE",
    );
  }
  await repo.updatePlan(id, { isActive: false });
}

// Plan limits
export async function listPlanLimits() {
  return repo.findPlanLimits();
}

export async function getPlanLimit(tier: string) {
  const limit = await repo.findPlanLimitByTier(tier);
  if (!limit) throw new NotFoundError("Plan limit not found");
  return limit;
}

export async function upsertPlanLimit(
  tier: string,
  data: Record<string, unknown>,
) {
  const updateData: Record<string, unknown> = {};
  const createData: Record<string, unknown> = {
    tier,
    maxUsers: 5,
    maxProducts: 100,
    maxLocations: 2,
    maxMembers: 50,
    maxCategories: 20,
    maxContacts: 100,
    bulkUpload: false,
    analytics: false,
    promoManagement: false,
    auditLogs: false,
    apiAccess: false,
  };
  [
    "maxUsers",
    "maxProducts",
    "maxLocations",
    "maxMembers",
    "maxCategories",
    "maxContacts",
    "bulkUpload",
    "analytics",
    "promoManagement",
    "auditLogs",
    "apiAccess",
  ].forEach((key) => {
    if (data[key] !== undefined) {
      updateData[key] = data[key];
      createData[key] = data[key];
    }
  });
  return repo.upsertPlanLimit(tier, updateData as any, createData as any);
}

export async function deletePlanLimit(tier: string) {
  await repo.deletePlanLimit(tier);
}

// Pricing plans - delegate to repo with minimal logic
export async function listPricingPlans() {
  return repo.findPricingPlans();
}

const DEFAULT_PRICING_PLANS = [
  { tier: "STARTER" as const, billingCycle: "MONTHLY" as const, price: 2999 },
  { tier: "STARTER" as const, billingCycle: "ANNUAL" as const, price: 29990 },
  {
    tier: "PROFESSIONAL" as const,
    billingCycle: "MONTHLY" as const,
    price: 6999,
  },
  {
    tier: "PROFESSIONAL" as const,
    billingCycle: "ANNUAL" as const,
    price: 69990,
  },
  { tier: "BUSINESS" as const, billingCycle: "MONTHLY" as const, price: 14999 },
  { tier: "BUSINESS" as const, billingCycle: "ANNUAL" as const, price: 149990 },
  { tier: "ENTERPRISE" as const, billingCycle: "MONTHLY" as const, price: 0 },
  { tier: "ENTERPRISE" as const, billingCycle: "ANNUAL" as const, price: 0 },
];

export async function initializeDefaultPricingPlans() {
  for (const pp of DEFAULT_PRICING_PLANS) {
    await repo.upsertPricingPlan(
      { tier_billingCycle: { tier: pp.tier, billingCycle: pp.billingCycle } },
      { price: pp.price },
      {
        tier: pp.tier,
        billingCycle: pp.billingCycle,
        price: pp.price,
        isActive: true,
      },
    );
  }
  return repo.findPricingPlans();
}

export async function getPricingPlan(tier: string, billingCycle: string) {
  const plan = await repo.findPricingPlanByTierAndCycle(tier, billingCycle);
  if (!plan) throw new NotFoundError("Pricing plan not found");
  return plan;
}

export async function createPricingPlan(data: Record<string, unknown>) {
  return repo.createPricingPlan(data as any);
}

export async function updatePricingPlan(
  tier: string,
  billingCycle: string,
  data: Record<string, unknown>,
) {
  return repo.updatePricingPlan(tier, billingCycle, data as any);
}

export async function deletePricingPlan(tier: string, billingCycle: string) {
  await repo.deletePricingPlan(tier, billingCycle);
}

// Subscriptions
export async function listSubscriptions(tenantId?: string) {
  return repo.findSubscriptions(tenantId ? { tenantId } : undefined);
}

export async function getSubscription(id: string) {
  const sub = await repo.findSubscriptionById(id);
  if (!sub) throw new NotFoundError("Subscription not found");
  return sub;
}

export async function createSubscription(data: Record<string, unknown>) {
  const tenant = await repo.findTenantById(data.tenantId as string);
  if (!tenant) throw new NotFoundError("Tenant not found");
  return repo.createSubscription({
    tenantId: data.tenantId as string,
    plan: data.plan as any,
    billingCycle: data.billingCycle as any,
    status: (data.status as any) ?? "TRIAL",
    currentPeriodStart: data.currentPeriodStart
      ? new Date(data.currentPeriodStart as string)
      : new Date(),
    currentPeriodEnd: data.currentPeriodEnd
      ? new Date(data.currentPeriodEnd as string)
      : new Date(),
    trialEndsAt: data.trialEndsAt
      ? new Date(data.trialEndsAt as string)
      : undefined,
    gracePeriodEnd: data.gracePeriodEnd
      ? new Date(data.gracePeriodEnd as string)
      : undefined,
  });
}

export async function updateSubscription(
  id: string,
  data: Record<string, unknown>,
) {
  return repo.updateSubscription(id, data as any);
}

export async function deleteSubscription(id: string) {
  await repo.deleteSubscription(id);
}

// Tenant payments
export async function listTenantPayments(filters: {
  tenantId?: string;
  subscriptionId?: string;
}) {
  const where: Record<string, string> = {};
  if (filters.tenantId) where.tenantId = filters.tenantId;
  if (filters.subscriptionId) where.subscriptionId = filters.subscriptionId;
  return repo.findTenantPayments(Object.keys(where).length ? where : undefined);
}

export async function getTenantPayment(id: string) {
  const payment = await repo.findTenantPaymentById(id);
  if (!payment) throw new NotFoundError("Payment not found");
  return payment;
}

export async function createTenantPayment(data: Record<string, unknown>) {
  const [tenant, subscription] = await Promise.all([
    repo.findTenantById(data.tenantId as string),
    repo.findSubscriptionById(data.subscriptionId as string),
  ]);
  if (!tenant) throw new NotFoundError("Tenant not found");
  if (!subscription) throw new NotFoundError("Subscription not found");
  return repo.createTenantPayment(data as any);
}

export async function updateTenantPayment(
  id: string,
  data: Record<string, unknown>,
) {
  return repo.updateTenantPayment(id, data as any);
}

export async function deleteTenantPayment(id: string) {
  await repo.deleteTenantPayment(id);
}

// Add-on pricing
export async function listAddOnPricing() {
  return repo.findAddOnPricingList();
}

export async function getAddOnPricing(id: string) {
  const pricing = await repo.findAddOnPricingById(id);
  if (!pricing) throw new NotFoundError("Add-on pricing not found");
  return pricing;
}

export async function createAddOnPricing(data: Record<string, unknown>) {
  return repo.createAddOnPricing(data as any);
}

export async function updateAddOnPricing(
  id: string,
  data: Record<string, unknown>,
) {
  return repo.updateAddOnPricing(id, data as any);
}

export async function deleteAddOnPricing(id: string) {
  await repo.deleteAddOnPricing(id);
}

// Tenant add-ons
export async function listTenantAddOns(filters: {
  tenantId?: string;
  status?: string;
}) {
  const where: Record<string, string> = {};
  if (filters.tenantId) where.tenantId = filters.tenantId;
  if (filters.status) where.status = filters.status;
  return repo.findTenantAddOns(Object.keys(where).length ? where : undefined);
}

export async function getTenantAddOn(id: string) {
  const addOn = await repo.findTenantAddOnById(id);
  if (!addOn) throw new NotFoundError("Tenant add-on not found");
  return addOn;
}

export async function createTenantAddOn(
  data: Record<string, unknown>,
  approvedBy: string | null,
) {
  const tenant = await repo.findTenantById(data.tenantId as string);
  if (!tenant) throw new NotFoundError("Tenant not found");
  return repo.createTenantAddOn({
    ...(data as any),
    status: data.status ?? "ACTIVE",
    quantity: data.quantity ?? 1,
    periodStart: data.periodStart
      ? new Date(data.periodStart as string)
      : new Date(),
    periodEnd: data.periodEnd ? new Date(data.periodEnd as string) : null,
    paymentId: data.paymentId ?? null,
    notes: data.notes ?? null,
    approvedAt: new Date(),
    approvedBy,
  });
}

export async function updateTenantAddOn(
  id: string,
  data: Record<string, unknown>,
) {
  return repo.updateTenantAddOn(id, data as any);
}

export async function approveTenantAddOn(id: string, userId: string | null) {
  const existing = await repo.findTenantAddOnById(id);
  if (!existing) throw new NotFoundError("Tenant add-on not found");
  if (existing.status !== "PENDING") {
    throw new DomainError(
      400,
      `Cannot approve add-on with status "${existing.status}". Only PENDING add-ons can be approved.`,
      "INVALID_STATUS",
    );
  }
  return repo.updateTenantAddOn(id, {
    status: "ACTIVE",
    approvedAt: new Date(),
    approvedBy: userId,
    periodStart: existing.periodStart ?? new Date(),
  });
}

export async function cancelTenantAddOn(id: string) {
  return repo.updateTenantAddOn(id, { status: "CANCELLED" });
}

export async function deleteTenantAddOn(id: string) {
  await repo.deleteTenantAddOn(id);
}
