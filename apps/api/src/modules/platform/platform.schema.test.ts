import { describe, it, expect } from "vitest";
import {
  changePlanSchema,
  createAddOnPricingSchema,
  createPricingPlanSchema,
  createPlatformPlanSchema,
  createSubscriptionSchema,
  createTenantAddOnSchema,
  createTenantPaymentSchema,
  createTenantSchema,
  entityIdParamsSchema,
  listSubscriptionsQuerySchema,
  listTenantAddOnsQuerySchema,
  listTenantPaymentsQuerySchema,
  planLimitTierParamsSchema,
  pricingPlanParamsSchema,
  resetTenantUserPasswordSchema,
  tenantUserPasswordParamsSchema,
  updateAddOnPricingSchema,
  updatePlanLimitSchema,
  updatePricingPlanSchema,
  updatePlatformPlanSchema,
  updateSubscriptionSchema,
  updateTenantAddOnSchema,
  updateTenantPaymentSchema,
  updateTenantSchema,
  upsertPlanLimitSchema,
} from "./platform.schema";

describe("platform tenant schemas", () => {
  it("validates createTenantSchema", () => {
    const parsed = createTenantSchema.parse({
      name: "  Acme Corp ",
      slug: "Acme-Shop",
      plan: "PROFESSIONAL",
      adminUsername: "  AdminUser ",
      adminPassword: "secret",
    });

    expect(parsed.name).toBe("Acme Corp");
    expect(parsed.slug).toBe("acme-shop");
    expect(parsed.adminUsername).toBe("AdminUser");
  });

  it("validates resetTenantUserPasswordSchema", () => {
    const parsed = resetTenantUserPasswordSchema.parse({
      newPassword: "123456",
    });
    expect(parsed.newPassword).toBe("123456");
  });

  it("validates updateTenantSchema partial payload", () => {
    const parsed = updateTenantSchema.parse({
      slug: "  my-tenant ",
      subscriptionStatus: "ACTIVE",
      trialEndsAt: "2026-12-31T00:00:00.000Z",
    });

    expect(parsed.slug).toBe("my-tenant");
    expect(parsed.subscriptionStatus).toBe("ACTIVE");
    expect(parsed.trialEndsAt).toBeInstanceOf(Date);
  });

  it("validates changePlanSchema", () => {
    const parsed = changePlanSchema.parse({
      plan: "ENTERPRISE",
      expiresAt: "2027-01-01T00:00:00.000Z",
    });

    expect(parsed.plan).toBe("ENTERPRISE");
    expect(parsed.expiresAt).toBeInstanceOf(Date);
  });

  it("validates createPlatformPlanSchema", () => {
    const parsed = createPlatformPlanSchema.parse({
      name: "  Pro Plan ",
      slug: " Pro-Plan ",
      tier: "PROFESSIONAL",
      rank: "2",
      isDefault: false,
    });

    expect(parsed.name).toBe("Pro Plan");
    expect(parsed.slug).toBe("pro-plan");
    expect(parsed.rank).toBe(2);
  });

  it("validates updatePlatformPlanSchema partial payload", () => {
    const parsed = updatePlatformPlanSchema.parse({
      slug: " Starter-Plan ",
      description: null,
    });

    expect(parsed.slug).toBe("starter-plan");
    expect(parsed.description).toBeNull();
  });

  it("validates upsertPlanLimitSchema", () => {
    const parsed = upsertPlanLimitSchema.parse({
      tier: "STARTER",
      maxUsers: "10",
      analytics: true,
    });

    expect(parsed.tier).toBe("STARTER");
    expect(parsed.maxUsers).toBe(10);
    expect(parsed.analytics).toBe(true);
  });

  it("validates updatePlanLimitSchema with route-tier use case", () => {
    const parsed = updatePlanLimitSchema.parse({
      maxProducts: "250",
      promoManagement: true,
    });

    expect(parsed.maxProducts).toBe(250);
    expect(parsed.promoManagement).toBe(true);
  });

  it("validates createPricingPlanSchema", () => {
    const parsed = createPricingPlanSchema.parse({
      tier: "BUSINESS",
      billingCycle: "MONTHLY",
      price: "14999",
      originalPrice: "19999",
      isActive: true,
    });

    expect(parsed.tier).toBe("BUSINESS");
    expect(parsed.billingCycle).toBe("MONTHLY");
    expect(parsed.price).toBe(14999);
    expect(parsed.originalPrice).toBe(19999);
  });

  it("validates updatePricingPlanSchema partial payload", () => {
    const parsed = updatePricingPlanSchema.parse({
      price: "9999",
      isActive: false,
    });

    expect(parsed.price).toBe(9999);
    expect(parsed.isActive).toBe(false);
  });

  it("validates createSubscriptionSchema", () => {
    const parsed = createSubscriptionSchema.parse({
      tenantId: "tenant-1",
      plan: "PROFESSIONAL",
      billingCycle: "MONTHLY",
      status: "ACTIVE",
      currentPeriodStart: "2026-01-01T00:00:00.000Z",
    });

    expect(parsed.tenantId).toBe("tenant-1");
    expect(parsed.plan).toBe("PROFESSIONAL");
    expect(parsed.currentPeriodStart).toBeInstanceOf(Date);
  });

  it("validates updateSubscriptionSchema partial payload", () => {
    const parsed = updateSubscriptionSchema.parse({
      status: "SUSPENDED",
      cancelledAt: "2026-05-01T00:00:00.000Z",
    });

    expect(parsed.status).toBe("SUSPENDED");
    expect(parsed.cancelledAt).toBeInstanceOf(Date);
  });

  it("validates createTenantPaymentSchema", () => {
    const parsed = createTenantPaymentSchema.parse({
      tenantId: "tenant-1",
      subscriptionId: "sub-1",
      amount: "1299",
      gateway: "ESEWA",
      paidFor: "STARTER",
      billingCycle: "MONTHLY",
      periodStart: "2026-01-01T00:00:00.000Z",
      periodEnd: "2026-02-01T00:00:00.000Z",
    });

    expect(parsed.amount).toBe(1299);
    expect(parsed.gateway).toBe("ESEWA");
    expect(parsed.periodStart).toBeInstanceOf(Date);
  });

  it("validates updateTenantPaymentSchema partial payload", () => {
    const parsed = updateTenantPaymentSchema.parse({
      status: "COMPLETED",
      verifiedAt: "2026-01-02T00:00:00.000Z",
    });

    expect(parsed.status).toBe("COMPLETED");
    expect(parsed.verifiedAt).toBeInstanceOf(Date);
  });

  it("validates createAddOnPricingSchema", () => {
    const parsed = createAddOnPricingSchema.parse({
      type: "EXTRA_USER",
      tier: "PROFESSIONAL",
      billingCycle: "MONTHLY",
      unitPrice: "100",
      minQuantity: "1",
    });

    expect(parsed.type).toBe("EXTRA_USER");
    expect(parsed.unitPrice).toBe(100);
    expect(parsed.minQuantity).toBe(1);
  });

  it("validates updateAddOnPricingSchema partial payload", () => {
    const parsed = updateAddOnPricingSchema.parse({
      unitPrice: "150",
      isActive: false,
    });

    expect(parsed.unitPrice).toBe(150);
    expect(parsed.isActive).toBe(false);
  });

  it("validates createTenantAddOnSchema", () => {
    const parsed = createTenantAddOnSchema.parse({
      tenantId: "tenant-1",
      type: "EXTRA_CONTACT",
      quantity: "2",
      status: "PENDING",
      periodStart: "2026-01-01T00:00:00.000Z",
    });

    expect(parsed.tenantId).toBe("tenant-1");
    expect(parsed.quantity).toBe(2);
    expect(parsed.periodStart).toBeInstanceOf(Date);
  });

  it("validates updateTenantAddOnSchema partial payload", () => {
    const parsed = updateTenantAddOnSchema.parse({
      status: "CANCELLED",
      periodEnd: "2026-02-01T00:00:00.000Z",
    });

    expect(parsed.status).toBe("CANCELLED");
    expect(parsed.periodEnd).toBeInstanceOf(Date);
  });

  it("validates planLimitTierParamsSchema", () => {
    const parsed = planLimitTierParamsSchema.parse({ tier: "STARTER" });
    expect(parsed.tier).toBe("STARTER");
  });

  it("validates pricingPlanParamsSchema", () => {
    const parsed = pricingPlanParamsSchema.parse({
      tier: "BUSINESS",
      billingCycle: "ANNUAL",
    });
    expect(parsed.tier).toBe("BUSINESS");
    expect(parsed.billingCycle).toBe("ANNUAL");
  });

  it("validates entityIdParamsSchema", () => {
    const parsed = entityIdParamsSchema.parse({ id: "abc123" });
    expect(parsed.id).toBe("abc123");
  });

  it("validates tenantUserPasswordParamsSchema", () => {
    const parsed = tenantUserPasswordParamsSchema.parse({
      tenantId: "t-1",
      userId: "u-1",
    });
    expect(parsed.tenantId).toBe("t-1");
    expect(parsed.userId).toBe("u-1");
  });

  it("validates list subscriptions/payments/add-ons query schemas", () => {
    expect(
      listSubscriptionsQuerySchema.parse({ tenantId: "t1" }).tenantId,
    ).toBe("t1");
    expect(
      listTenantPaymentsQuerySchema.parse({
        tenantId: "t1",
        subscriptionId: "s1",
      }).subscriptionId,
    ).toBe("s1");
    expect(listTenantAddOnsQuerySchema.parse({ status: "ACTIVE" }).status).toBe(
      "ACTIVE",
    );
  });
});
