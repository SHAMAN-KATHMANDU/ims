/**
 * Platform repository: all database access for platform admin (cross-tenant).
 * Uses basePrisma only; no tenant scoping.
 */

import { basePrisma } from "@/config/prisma";
import type { Prisma } from "@prisma/client";

const DEFAULT_DISCOUNT_TYPE_NAMES = [
  "Non-Member",
  "Member",
  "Wholesale",
  "Special",
];

export function runTransaction<T>(fn: (tx: typeof basePrisma) => Promise<T>) {
  return basePrisma.$transaction(fn as any);
}

export async function createTenantWithAdminAndDiscountTypes(
  tx: typeof basePrisma,
  data: {
    name: string;
    slug: string;
    plan: string;
    trialEndsAt: Date;
    adminUsername: string;
    hashedPassword: string;
  },
) {
  const tenant = await tx.tenant.create({
    data: {
      name: data.name,
      slug: data.slug,
      plan: data.plan as "STARTER" | "PROFESSIONAL" | "ENTERPRISE",
      isTrial: true,
      trialEndsAt: data.trialEndsAt,
      subscriptionStatus: "TRIAL",
    },
  });
  const adminUser = await tx.user.create({
    data: {
      tenantId: tenant.id,
      username: data.adminUsername,
      password: data.hashedPassword,
      role: "superAdmin",
    },
  });
  for (const name of DEFAULT_DISCOUNT_TYPE_NAMES) {
    await tx.discountType.create({
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
}

export function findTenantBySlug(slug: string) {
  return basePrisma.tenant.findUnique({ where: { slug } });
}

export function findTenantById(id: string) {
  return basePrisma.tenant.findUnique({ where: { id } });
}

export function findTenantsWithCounts() {
  return basePrisma.tenant.findMany({
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

export function findTenantByIdWithUsersAndCounts(id: string) {
  return basePrisma.tenant.findUnique({
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
      subscriptions: { orderBy: { createdAt: "desc" }, take: 5 },
      payments: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
}

export function findUserById(id: string) {
  return basePrisma.user.findUnique({ where: { id } });
}

export function updateUserPassword(id: string, hashedPassword: string) {
  return basePrisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });
}

export function updateTenant(id: string, data: Prisma.TenantUpdateInput) {
  return basePrisma.tenant.update({ where: { id }, data });
}

export function updateTenantPlan(
  id: string,
  data: {
    plan: string;
    isTrial: boolean;
    subscriptionStatus: string;
    planExpiresAt?: Date;
  },
) {
  return basePrisma.tenant.update({
    where: { id },
    data: {
      plan: data.plan as any,
      isTrial: data.isTrial,
      subscriptionStatus: data.subscriptionStatus as any,
      planExpiresAt: data.planExpiresAt,
    },
  });
}

// Stats
export function countTenants(where?: Prisma.TenantWhereInput) {
  return basePrisma.tenant.count({ where });
}

export function countUsers() {
  return basePrisma.user.count();
}

export function countSales() {
  return basePrisma.sale.count();
}

export function groupTenantsByPlan(where?: Prisma.TenantWhereInput) {
  return basePrisma.tenant.groupBy({
    by: ["plan"],
    _count: true,
    where,
  });
}

// Analytics
export function aggregateTenantPaymentSum(
  where: Prisma.TenantPaymentWhereInput,
) {
  return basePrisma.tenantPayment.aggregate({
    _sum: { amount: true },
    where,
  });
}

export function countTenantPaymentsByStatus(status: string) {
  return basePrisma.tenantPayment.count({ where: { status: status as any } });
}

export function countSubscriptionsByStatus(status: string) {
  return basePrisma.subscription.count({ where: { status: status as any } });
}

export function groupTenantPaymentsByGateway(
  where: Prisma.TenantPaymentWhereInput,
) {
  return basePrisma.tenantPayment.groupBy({
    by: ["gateway"],
    _count: true,
    _sum: { amount: true },
    where,
  });
}

export function findTenantPaymentsRecent(take: number) {
  return basePrisma.tenantPayment.findMany({
    take,
    orderBy: { createdAt: "desc" },
    include: { tenant: { select: { name: true, slug: true } } },
  });
}

export function rawMonthlyRevenue(since: Date) {
  return basePrisma.$queryRaw<
    Array<{ month: string; revenue: string; count: string }>
  >`
    SELECT
      TO_CHAR(created_at, 'YYYY-MM') as month,
      SUM(amount) as revenue,
      COUNT(*) as count
    FROM tenant_payments
    WHERE status = 'COMPLETED' AND created_at >= ${since}
    GROUP BY TO_CHAR(created_at, 'YYYY-MM')
    ORDER BY month ASC
  `;
}

export function rawTenantGrowth(since: Date) {
  return basePrisma.$queryRaw<Array<{ month: string; count: string }>>`
    SELECT
      TO_CHAR(created_at, 'YYYY-MM') as month,
      COUNT(*) as count
    FROM tenants
    WHERE created_at >= ${since}
    GROUP BY TO_CHAR(created_at, 'YYYY-MM')
    ORDER BY month ASC
  `;
}

export function findPlans() {
  return basePrisma.plan.findMany({ orderBy: { rank: "asc" } });
}

// Tenant detail
export function findTenantDetail(id: string) {
  return basePrisma.tenant.findUnique({
    where: { id },
    include: {
      users: {
        select: { id: true, username: true, role: true, lastLoginAt: true },
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
          categories: true,
        },
      },
      subscriptions: { orderBy: { createdAt: "desc" }, take: 5 },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          subscription: { select: { plan: true, billingCycle: true } },
        },
      },
      addOns: { orderBy: { createdAt: "desc" } },
    },
  });
}

export function countContactsByTenantOwner(tenantId: string) {
  return basePrisma.contact.count({
    where: { owner: { tenantId }, deletedAt: null },
  });
}

// Subscription expiry
export function updateSubscriptionsToPastDue(
  where: Prisma.SubscriptionWhereInput,
) {
  return basePrisma.subscription.updateMany({
    where,
    data: { status: "PAST_DUE" },
  });
}

export function updateSubscriptionsToSuspended(
  where: Prisma.SubscriptionWhereInput,
) {
  return basePrisma.subscription.updateMany({
    where,
    data: { status: "SUSPENDED" },
  });
}

export function findSubscriptionsWithStatus(statuses: string[]) {
  return basePrisma.subscription.findMany({
    where: { status: { in: statuses as any[] } },
    select: { tenantId: true, status: true },
  });
}

export function updateTenantSubscriptionStatus(
  tenantId: string,
  status: string,
) {
  return basePrisma.tenant.update({
    where: { id: tenantId },
    data: { subscriptionStatus: status as any },
  });
}

// Plans
export function findPlanById(id: string) {
  return basePrisma.plan.findUnique({ where: { id } });
}

export function createPlan(data: Prisma.PlanCreateInput) {
  return basePrisma.plan.create({ data });
}

export function updatePlan(id: string, data: Prisma.PlanUpdateInput) {
  return basePrisma.plan.update({ where: { id }, data });
}

export function countTenantsByPlanTier(planTier: string) {
  return basePrisma.tenant.count({
    where: { plan: planTier as any },
  });
}

// Plan limits
export function findPlanLimits() {
  return basePrisma.planLimit.findMany({ orderBy: { tier: "asc" } });
}

export function findPlanLimitByTier(tier: string) {
  return basePrisma.planLimit.findUnique({
    where: { tier: tier as any },
  });
}

export function upsertPlanLimit(
  tier: string,
  data: Prisma.PlanLimitCreateInput | Prisma.PlanLimitUpdateInput,
  create: Prisma.PlanLimitCreateInput,
) {
  return basePrisma.planLimit.upsert({
    where: { tier: tier as any },
    update: data as Prisma.PlanLimitUpdateInput,
    create: create as Prisma.PlanLimitUncheckedCreateInput,
  });
}

export function deletePlanLimit(tier: string) {
  return basePrisma.planLimit.delete({
    where: { tier: tier as any },
  });
}

// Pricing plans
export function findPricingPlans() {
  return basePrisma.pricingPlan.findMany({
    orderBy: [{ tier: "asc" }, { billingCycle: "asc" }],
  });
}

export function findPricingPlanByTierAndCycle(
  tier: string,
  billingCycle: string,
) {
  return basePrisma.pricingPlan.findUnique({
    where: {
      tier_billingCycle: {
        tier: tier as any,
        billingCycle: billingCycle as any,
      },
    },
  });
}

export function upsertPricingPlan(
  where: Prisma.PricingPlanWhereUniqueInput,
  update: Prisma.PricingPlanUpdateInput,
  create: Prisma.PricingPlanCreateInput,
) {
  return basePrisma.pricingPlan.upsert({
    where,
    update,
    create: create as Prisma.PricingPlanUncheckedCreateInput,
  });
}

export function createPricingPlan(data: Prisma.PricingPlanCreateInput) {
  return basePrisma.pricingPlan.create({
    data: data as Prisma.PricingPlanUncheckedCreateInput,
  });
}

export function updatePricingPlan(
  tier: string,
  billingCycle: string,
  data: Prisma.PricingPlanUpdateInput,
) {
  return basePrisma.pricingPlan.update({
    where: {
      tier_billingCycle: {
        tier: tier as any,
        billingCycle: billingCycle as any,
      },
    },
    data,
  });
}

export function deletePricingPlan(tier: string, billingCycle: string) {
  return basePrisma.pricingPlan.delete({
    where: {
      tier_billingCycle: {
        tier: tier as any,
        billingCycle: billingCycle as any,
      },
    },
  });
}

// Subscriptions
export function findSubscriptions(where?: Prisma.SubscriptionWhereInput) {
  return basePrisma.subscription.findMany({
    where,
    include: {
      tenant: { select: { id: true, name: true, slug: true } },
      _count: { select: { payments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function findSubscriptionById(id: string) {
  return basePrisma.subscription.findUnique({
    where: { id },
    include: {
      tenant: { select: { id: true, name: true, slug: true } },
      payments: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
}

export function createSubscription(
  data: Prisma.SubscriptionUncheckedCreateInput,
) {
  return basePrisma.subscription.create({
    data,
  });
}

export function updateSubscription(
  id: string,
  data: Prisma.SubscriptionUpdateInput,
) {
  return basePrisma.subscription.update({
    where: { id },
    data,
  });
}

export function deleteSubscription(id: string) {
  return basePrisma.subscription.delete({ where: { id } });
}

// Tenant payments
export function findTenantPayments(where?: Prisma.TenantPaymentWhereInput) {
  return basePrisma.tenantPayment.findMany({
    where,
    include: {
      tenant: { select: { id: true, name: true, slug: true } },
      subscription: { select: { id: true, plan: true, billingCycle: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function findTenantPaymentById(id: string) {
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

export function createTenantPayment(
  data: Prisma.TenantPaymentUncheckedCreateInput,
) {
  return basePrisma.tenantPayment.create({ data });
}

export function updateTenantPayment(
  id: string,
  data: Prisma.TenantPaymentUpdateInput,
) {
  return basePrisma.tenantPayment.update({ where: { id }, data });
}

export function deleteTenantPayment(id: string) {
  return basePrisma.tenantPayment.delete({ where: { id } });
}

// Add-on pricing
export function findAddOnPricingList() {
  return basePrisma.addOnPricing.findMany({
    orderBy: [{ type: "asc" }, { tier: "asc" }, { billingCycle: "asc" }],
  });
}

export function findAddOnPricingById(id: string) {
  return basePrisma.addOnPricing.findUnique({ where: { id } });
}

export function createAddOnPricing(
  data: Prisma.AddOnPricingUncheckedCreateInput,
) {
  return basePrisma.addOnPricing.create({ data });
}

export function updateAddOnPricing(
  id: string,
  data: Prisma.AddOnPricingUpdateInput,
) {
  return basePrisma.addOnPricing.update({ where: { id }, data });
}

export function deleteAddOnPricing(id: string) {
  return basePrisma.addOnPricing.delete({ where: { id } });
}

// Tenant add-ons
export function findTenantAddOns(where?: Prisma.TenantAddOnWhereInput) {
  return basePrisma.tenantAddOn.findMany({
    where,
    include: { tenant: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export function findTenantAddOnById(id: string) {
  return basePrisma.tenantAddOn.findUnique({
    where: { id },
    include: { tenant: { select: { id: true, name: true, slug: true } } },
  });
}

export function createTenantAddOn(
  data: Prisma.TenantAddOnUncheckedCreateInput,
) {
  return basePrisma.tenantAddOn.create({ data });
}

export function updateTenantAddOn(
  id: string,
  data: Prisma.TenantAddOnUpdateInput,
) {
  return basePrisma.tenantAddOn.update({ where: { id }, data });
}

export function deleteTenantAddOn(id: string) {
  return basePrisma.tenantAddOn.delete({ where: { id } });
}
