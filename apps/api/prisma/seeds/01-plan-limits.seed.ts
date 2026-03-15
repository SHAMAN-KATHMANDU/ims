import type { PrismaClient } from "@prisma/client";

/** Plan limits matching @repo/shared DEFAULT_PLAN_LIMITS. Idempotent upsert. */
export async function seedPlanLimits(prisma: PrismaClient): Promise<void> {
  await prisma.planLimit.upsert({
    where: { tier: "STARTER" },
    create: {
      tier: "STARTER",
      maxUsers: 3,
      maxProducts: 100,
      maxLocations: 2,
      maxMembers: 500,
      maxCustomers: 100,
      bulkUpload: false,
      analytics: false,
      promoManagement: false,
      auditLogs: false,
      apiAccess: false,
      salesPipeline: false,
    },
    update: {
      maxUsers: 3,
      maxProducts: 100,
      maxLocations: 2,
      maxMembers: 500,
      maxCustomers: 100,
      bulkUpload: false,
      analytics: false,
      promoManagement: false,
      auditLogs: false,
      apiAccess: false,
      salesPipeline: false,
    },
  });

  await prisma.planLimit.upsert({
    where: { tier: "PROFESSIONAL" },
    create: {
      tier: "PROFESSIONAL",
      maxUsers: 10,
      maxProducts: 1000,
      maxLocations: 10,
      maxMembers: 5000,
      maxCustomers: 1000,
      bulkUpload: true,
      analytics: true,
      promoManagement: true,
      auditLogs: false,
      apiAccess: false,
      salesPipeline: true,
    },
    update: {
      maxUsers: 10,
      maxProducts: 1000,
      maxLocations: 10,
      maxMembers: 5000,
      maxCustomers: 1000,
      bulkUpload: true,
      analytics: true,
      promoManagement: true,
      auditLogs: false,
      apiAccess: false,
      salesPipeline: true,
    },
  });

  await prisma.planLimit.upsert({
    where: { tier: "ENTERPRISE" },
    create: {
      tier: "ENTERPRISE",
      maxUsers: -1,
      maxProducts: -1,
      maxLocations: -1,
      maxMembers: -1,
      maxCustomers: -1,
      bulkUpload: true,
      analytics: true,
      promoManagement: true,
      auditLogs: true,
      apiAccess: true,
      salesPipeline: true,
    },
    update: {
      maxUsers: -1,
      maxProducts: -1,
      maxLocations: -1,
      maxMembers: -1,
      maxCustomers: -1,
      bulkUpload: true,
      analytics: true,
      promoManagement: true,
      auditLogs: true,
      apiAccess: true,
      salesPipeline: true,
    },
  });

  // PricingPlan: MONTHLY and ANNUAL per tier (idempotent upsert by tier + billingCycle)
  const pricingRows: Array<{
    tier: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
    billingCycle: "MONTHLY" | "ANNUAL";
    price: number;
    originalPrice?: number;
  }> = [
    { tier: "STARTER", billingCycle: "MONTHLY", price: 999 },
    {
      tier: "STARTER",
      billingCycle: "ANNUAL",
      price: 9990,
      originalPrice: 11988,
    },
    { tier: "PROFESSIONAL", billingCycle: "MONTHLY", price: 2999 },
    {
      tier: "PROFESSIONAL",
      billingCycle: "ANNUAL",
      price: 29990,
      originalPrice: 35988,
    },
    { tier: "ENTERPRISE", billingCycle: "MONTHLY", price: 9999 },
    {
      tier: "ENTERPRISE",
      billingCycle: "ANNUAL",
      price: 99990,
      originalPrice: 119988,
    },
  ];

  for (const row of pricingRows) {
    await prisma.pricingPlan.upsert({
      where: {
        tier_billingCycle: { tier: row.tier, billingCycle: row.billingCycle },
      },
      create: {
        tier: row.tier,
        billingCycle: row.billingCycle,
        price: row.price,
        originalPrice: row.originalPrice ?? null,
        isActive: true,
      },
      update: {
        price: row.price,
        originalPrice: row.originalPrice ?? null,
        isActive: true,
      },
    });
  }

  console.log("  ✓ Plan limits and pricing plans");
}
