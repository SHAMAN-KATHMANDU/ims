import { z } from "zod";

const tenantPlanSchema = z.enum(["STARTER", "PROFESSIONAL", "ENTERPRISE"]);
const pricingPlanTierSchema = z.enum([
  "STARTER",
  "PROFESSIONAL",
  "BUSINESS",
  "ENTERPRISE",
]);
const billingCycleSchema = z.enum(["MONTHLY", "ANNUAL"]);
const subscriptionStatusSchema = z.enum([
  "TRIAL",
  "ACTIVE",
  "PAST_DUE",
  "SUSPENDED",
  "LOCKED",
  "CANCELLED",
]);

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/, {
    message:
      "Slug must be lowercase alphanumeric with optional hyphens, 1-63 characters",
  });

export const createTenantSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  slug: slugSchema,
  plan: tenantPlanSchema.optional(),
  adminUsername: z.string().trim().min(1, "adminUsername is required"),
  adminPassword: z.string().min(1, "adminPassword is required"),
});

export const resetTenantUserPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export const updateTenantSchema = z.object({
  name: z.string().trim().min(1).optional(),
  slug: slugSchema.optional(),
  isActive: z.boolean().optional(),
  subscriptionStatus: subscriptionStatusSchema.optional(),
  isTrial: z.boolean().optional(),
  trialEndsAt: z.coerce.date().optional().nullable(),
  planExpiresAt: z.coerce.date().optional().nullable(),
  settings: z.record(z.any()).optional(),
});

export const changePlanSchema = z.object({
  plan: tenantPlanSchema,
  expiresAt: z.coerce.date().optional().nullable(),
});

export const createPlatformPlanSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  slug: slugSchema,
  tier: tenantPlanSchema,
  rank: z.coerce.number().int().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  description: z.string().trim().optional().nullable(),
});

export const updatePlatformPlanSchema = z.object({
  name: z.string().trim().min(1).optional(),
  slug: slugSchema.optional(),
  rank: z.coerce.number().int().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  description: z.string().trim().optional().nullable(),
});

export const upsertPlanLimitSchema = z.object({
  tier: tenantPlanSchema,
  maxUsers: z.coerce.number().int().min(0).optional(),
  maxProducts: z.coerce.number().int().min(0).optional(),
  maxLocations: z.coerce.number().int().min(0).optional(),
  maxMembers: z.coerce.number().int().min(0).optional(),
  maxCategories: z.coerce.number().int().min(0).optional(),
  maxContacts: z.coerce.number().int().min(0).optional(),
  bulkUpload: z.boolean().optional(),
  analytics: z.boolean().optional(),
  promoManagement: z.boolean().optional(),
  auditLogs: z.boolean().optional(),
  apiAccess: z.boolean().optional(),
});

export const updatePlanLimitSchema = upsertPlanLimitSchema.extend({
  tier: tenantPlanSchema.optional(),
});

export const createPricingPlanSchema = z.object({
  tier: pricingPlanTierSchema,
  billingCycle: billingCycleSchema,
  price: z.coerce.number().min(0),
  originalPrice: z.coerce.number().min(0).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updatePricingPlanSchema = z.object({
  price: z.coerce.number().min(0).optional(),
  originalPrice: z.coerce.number().min(0).optional().nullable(),
  isActive: z.boolean().optional(),
});

const subscriptionPlanSchema = z.enum([
  "STARTER",
  "PROFESSIONAL",
  "ENTERPRISE",
]);
const subscriptionBillingCycleSchema = z.enum(["MONTHLY", "ANNUAL"]);

export const createSubscriptionSchema = z.object({
  tenantId: z.string().trim().min(1, "tenantId is required"),
  plan: subscriptionPlanSchema,
  billingCycle: subscriptionBillingCycleSchema,
  status: subscriptionStatusSchema.optional(),
  currentPeriodStart: z.coerce.date().optional(),
  currentPeriodEnd: z.coerce.date().optional(),
  trialEndsAt: z.coerce.date().optional().nullable(),
  gracePeriodEnd: z.coerce.date().optional().nullable(),
});

export const updateSubscriptionSchema = z.object({
  plan: subscriptionPlanSchema.optional(),
  billingCycle: subscriptionBillingCycleSchema.optional(),
  status: subscriptionStatusSchema.optional(),
  currentPeriodStart: z.coerce.date().optional(),
  currentPeriodEnd: z.coerce.date().optional(),
  trialEndsAt: z.coerce.date().optional().nullable(),
  gracePeriodEnd: z.coerce.date().optional().nullable(),
  cancelledAt: z.coerce.date().optional().nullable(),
});

const paymentGatewaySchema = z.enum([
  "ESEWA",
  "KHALTI",
  "FONEPAY",
  "CONNECTIPS",
  "BANK_TRANSFER",
  "MANUAL",
]);
const paymentStatusSchema = z.enum([
  "PENDING",
  "COMPLETED",
  "FAILED",
  "REFUNDED",
]);
const paidForPlanSchema = z.enum(["STARTER", "PROFESSIONAL", "ENTERPRISE"]);
const addOnTypeSchema = z.enum([
  "EXTRA_USER",
  "EXTRA_PRODUCT",
  "EXTRA_LOCATION",
  "EXTRA_MEMBER",
  "EXTRA_CATEGORY",
  "EXTRA_CONTACT",
]);
const addOnStatusSchema = z.enum(["PENDING", "ACTIVE", "CANCELLED"]);

export const createTenantPaymentSchema = z.object({
  tenantId: z.string().trim().min(1, "tenantId is required"),
  subscriptionId: z.string().trim().min(1, "subscriptionId is required"),
  amount: z.coerce.number(),
  currency: z.string().trim().min(1).optional(),
  gateway: paymentGatewaySchema,
  gatewayTxnId: z.string().trim().optional().nullable(),
  gatewayResponse: z.any().optional(),
  status: paymentStatusSchema.optional(),
  paidFor: paidForPlanSchema,
  billingCycle: subscriptionBillingCycleSchema,
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  verifiedAt: z.coerce.date().optional().nullable(),
  verifiedBy: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export const updateTenantPaymentSchema = z.object({
  amount: z.coerce.number().optional(),
  currency: z.string().trim().min(1).optional(),
  gateway: paymentGatewaySchema.optional(),
  gatewayTxnId: z.string().trim().optional().nullable(),
  gatewayResponse: z.any().optional(),
  status: paymentStatusSchema.optional(),
  verifiedAt: z.coerce.date().optional().nullable(),
  verifiedBy: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export const createAddOnPricingSchema = z.object({
  type: addOnTypeSchema,
  tier: z
    .enum(["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"])
    .optional()
    .nullable(),
  billingCycle: z.enum(["MONTHLY", "ANNUAL"]).optional(),
  unitPrice: z.coerce.number(),
  minQuantity: z.coerce.number().int().min(1).optional(),
  maxQuantity: z.coerce.number().int().min(1).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateAddOnPricingSchema = z.object({
  unitPrice: z.coerce.number().optional(),
  minQuantity: z.coerce.number().int().min(1).optional(),
  maxQuantity: z.coerce.number().int().min(1).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const createTenantAddOnSchema = z.object({
  tenantId: z.string().trim().min(1, "tenantId is required"),
  type: addOnTypeSchema,
  quantity: z.coerce.number().int().min(1).optional(),
  status: addOnStatusSchema.optional(),
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional().nullable(),
  paymentId: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export const updateTenantAddOnSchema = z.object({
  quantity: z.coerce.number().int().min(1).optional(),
  status: addOnStatusSchema.optional(),
  periodStart: z.coerce.date().optional().nullable(),
  periodEnd: z.coerce.date().optional().nullable(),
  paymentId: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export const planLimitTierParamsSchema = z.object({
  tier: tenantPlanSchema,
});

export const pricingPlanParamsSchema = z.object({
  tier: z.enum(["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"]),
  billingCycle: z.enum(["MONTHLY", "ANNUAL"]),
});

export const entityIdParamsSchema = z.object({
  id: z.string().trim().min(1, "id is required"),
});

export const tenantUserPasswordParamsSchema = z.object({
  tenantId: z.string().trim().min(1, "tenantId is required"),
  userId: z.string().trim().min(1, "userId is required"),
});

export const listSubscriptionsQuerySchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
});

export const listTenantPaymentsQuerySchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  subscriptionId: z.string().trim().min(1).optional(),
});

export const listTenantAddOnsQuerySchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  status: addOnStatusSchema.optional(),
});
