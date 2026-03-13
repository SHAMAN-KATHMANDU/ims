import type { PrismaClient } from "@prisma/client";
import { getSubscriptionPeriod } from "./utils";

export interface TenantSeedOptions {
  name: string;
  plan?: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  isTrial?: boolean;
  subscriptionStatus?: "TRIAL" | "ACTIVE";
}

export interface TenantSeedResult {
  tenantId: string;
  subscriptionId: string;
}

/**
 * Create or update a tenant and its subscription. Idempotent by slug.
 */
export async function seedTenant(
  prisma: PrismaClient,
  slug: string,
  options: TenantSeedOptions,
): Promise<TenantSeedResult> {
  const { periodStart, periodEnd } = getSubscriptionPeriod();
  const plan = options.plan ?? "PROFESSIONAL";
  const isTrial = options.isTrial ?? false;
  const subscriptionStatus = options.subscriptionStatus ?? "ACTIVE";

  const tenant = await prisma.tenant.upsert({
    where: { slug },
    create: {
      name: options.name,
      slug,
      plan,
      isActive: true,
      isTrial,
      subscriptionStatus,
      planExpiresAt: subscriptionStatus === "ACTIVE" ? periodEnd : null,
      trialEndsAt: isTrial ? periodEnd : null,
      settings: { timezone: "Asia/Kathmandu", currency: "NPR" },
    },
    update: {
      name: options.name,
      plan,
      isActive: true,
      isTrial,
      subscriptionStatus,
      planExpiresAt: subscriptionStatus === "ACTIVE" ? periodEnd : null,
      trialEndsAt: isTrial ? periodEnd : null,
      settings: { timezone: "Asia/Kathmandu", currency: "NPR" },
    },
  });

  let subscription = await prisma.subscription.findFirst({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
  });
  if (!subscription) {
    subscription = await prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        plan,
        billingCycle: "MONTHLY",
        status: subscriptionStatus,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        trialEndsAt: isTrial ? periodEnd : null,
      },
    });
  }

  const existingPayment = await prisma.tenantPayment.findFirst({
    where: { tenantId: tenant.id, subscriptionId: subscription.id },
  });
  if (!existingPayment) {
    await prisma.tenantPayment.create({
      data: {
        tenantId: tenant.id,
        subscriptionId: subscription.id,
        amount: plan === "PROFESSIONAL" ? 2999 : 999,
        currency: "NPR",
        gateway: "KHALTI",
        status: "COMPLETED",
        paidFor: plan,
        billingCycle: "MONTHLY",
        periodStart,
        periodEnd,
        verifiedAt: new Date(),
        verifiedBy: "seed",
      },
    });
  }

  return { tenantId: tenant.id, subscriptionId: subscription.id };
}
