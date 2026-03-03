import { z } from "zod";

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

const planTierSchema = z.enum(["STARTER", "PROFESSIONAL", "ENTERPRISE"]);
const subscriptionStatusSchema = z.enum([
  "TRIAL",
  "ACTIVE",
  "PAST_DUE",
  "SUSPENDED",
  "LOCKED",
  "CANCELLED",
]);

/** For update: undefined = no change, ""/null = set to null. */
const optionalIntOrNullUpdate = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .optional()
  .transform((v) =>
    v === undefined ? undefined : v === "" || v === null ? null : Number(v),
  );

/** For update: undefined = no change, ""/null = set to null. */
const optionalDateOrNullUpdate = z
  .union([z.string().datetime(), z.string(), z.date(), z.null(), z.undefined()])
  .optional()
  .transform((v) =>
    v === undefined
      ? undefined
      : v === "" || v === null
        ? null
        : new Date(v as string | Date),
  );

/** Create tenant with initial superAdmin. */
export const CreateTenantSchema = z.object({
  name: z.string().min(1, "name is required"),
  slug: z
    .string()
    .min(1, "slug is required")
    .regex(
      SLUG_REGEX,
      "Slug must be lowercase alphanumeric with optional hyphens, 1-63 characters",
    ),
  plan: planTierSchema.default("STARTER"),
  adminUsername: z.string().min(1, "adminUsername is required"),
  adminPassword: z.string().min(6, "Password must be at least 6 characters"),
});

/** Update tenant (partial). */
export const UpdateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z
    .string()
    .regex(
      SLUG_REGEX,
      "Slug must be lowercase alphanumeric with optional hyphens, 1-63 characters",
    )
    .optional(),
  isActive: z.boolean().optional(),
  subscriptionStatus: subscriptionStatusSchema.optional(),
  isTrial: z.boolean().optional(),
  trialEndsAt: optionalDateOrNullUpdate,
  planExpiresAt: optionalDateOrNullUpdate,
  settings: z.unknown().optional(),
  customMaxUsers: optionalIntOrNullUpdate,
  customMaxProducts: optionalIntOrNullUpdate,
  customMaxLocations: optionalIntOrNullUpdate,
  customMaxMembers: optionalIntOrNullUpdate,
  customMaxCustomers: optionalIntOrNullUpdate,
});

/** Reset tenant user password (platform admin). */
export const ResetTenantUserPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

/** Change tenant plan. */
export const ChangePlanSchema = z.object({
  plan: planTierSchema,
  expiresAt: z
    .union([
      z.string().datetime(),
      z.string(),
      z.date(),
      z.null(),
      z.undefined(),
    ])
    .optional()
    .transform((v) =>
      v === "" || v === null || v === undefined
        ? undefined
        : new Date(v as string | Date),
    ),
});

/** Upsert plan limit. */
export const UpsertPlanLimitSchema = z.object({
  tier: planTierSchema,
  maxUsers: z.number().int().min(0).optional(),
  maxProducts: z.number().int().min(0).optional(),
  maxLocations: z.number().int().min(0).optional(),
  maxMembers: z.number().int().min(0).optional(),
  maxCustomers: z.number().int().min(0).optional(),
  bulkUpload: z.boolean().optional(),
  analytics: z.boolean().optional(),
  promoManagement: z.boolean().optional(),
  auditLogs: z.boolean().optional(),
  apiAccess: z.boolean().optional(),
});

/** Create pricing plan. */
export const CreatePricingPlanSchema = z.object({
  tier: planTierSchema,
  billingCycle: z.enum(["MONTHLY", "ANNUAL"]),
  price: z.number().min(0),
  originalPrice: z.number().optional().nullable(),
  isActive: z.boolean().optional(),
});

/** Update pricing plan. */
export const UpdatePricingPlanSchema = z.object({
  price: z.number().min(0).optional(),
  originalPrice: z.number().optional().nullable(),
  isActive: z.boolean().optional(),
});

/** Create subscription. */
export const CreateSubscriptionSchema = z.object({
  tenantId: z.string().uuid(),
  plan: planTierSchema,
  billingCycle: z.enum(["MONTHLY", "ANNUAL"]),
  status: subscriptionStatusSchema.optional().default("TRIAL"),
  currentPeriodStart: z
    .union([z.string().datetime(), z.string(), z.date()])
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  currentPeriodEnd: z
    .union([z.string().datetime(), z.string(), z.date()])
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  trialEndsAt: optionalDateOrNullUpdate,
  gracePeriodEnd: optionalDateOrNullUpdate,
});

/** Update subscription. */
export const UpdateSubscriptionSchema = z.object({
  plan: planTierSchema.optional(),
  billingCycle: z.enum(["MONTHLY", "ANNUAL"]).optional(),
  status: subscriptionStatusSchema.optional(),
  currentPeriodStart: z
    .union([z.string().datetime(), z.string(), z.date()])
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  currentPeriodEnd: z
    .union([z.string().datetime(), z.string(), z.date()])
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  trialEndsAt: optionalDateOrNullUpdate,
  gracePeriodEnd: optionalDateOrNullUpdate,
  cancelledAt: optionalDateOrNullUpdate,
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

/** Create tenant payment. */
export const CreateTenantPaymentSchema = z.object({
  tenantId: z.string().uuid(),
  subscriptionId: z.string().uuid(),
  amount: z.number().min(0),
  currency: z.string().default("NPR"),
  gateway: paymentGatewaySchema,
  gatewayTxnId: z.string().optional().nullable(),
  gatewayResponse: z.unknown().optional(),
  status: paymentStatusSchema.optional().default("PENDING"),
  paidFor: planTierSchema,
  billingCycle: z.enum(["MONTHLY", "ANNUAL"]),
  periodStart: z.union([z.string().datetime(), z.string(), z.date()]),
  periodEnd: z.union([z.string().datetime(), z.string(), z.date()]),
  verifiedAt: optionalDateOrNullUpdate,
  verifiedBy: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

/** Update tenant payment. */
export const UpdateTenantPaymentSchema = z.object({
  amount: z.number().min(0).optional(),
  currency: z.string().optional(),
  gateway: paymentGatewaySchema.optional(),
  gatewayTxnId: z.string().optional().nullable(),
  gatewayResponse: z.unknown().optional(),
  status: paymentStatusSchema.optional(),
  verifiedAt: optionalDateOrNullUpdate,
  verifiedBy: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateTenantDto = z.infer<typeof CreateTenantSchema>;
export type UpdateTenantDto = z.infer<typeof UpdateTenantSchema>;
export type ResetTenantUserPasswordDto = z.infer<
  typeof ResetTenantUserPasswordSchema
>;
export type ChangePlanDto = z.infer<typeof ChangePlanSchema>;
export type UpsertPlanLimitDto = z.infer<typeof UpsertPlanLimitSchema>;
export type CreatePricingPlanDto = z.infer<typeof CreatePricingPlanSchema>;
export type UpdatePricingPlanDto = z.infer<typeof UpdatePricingPlanSchema>;
export type CreateSubscriptionDto = z.infer<typeof CreateSubscriptionSchema>;
export type UpdateSubscriptionDto = z.infer<typeof UpdateSubscriptionSchema>;
export type CreateTenantPaymentDto = z.infer<typeof CreateTenantPaymentSchema>;
export type UpdateTenantPaymentDto = z.infer<typeof UpdateTenantPaymentSchema>;
