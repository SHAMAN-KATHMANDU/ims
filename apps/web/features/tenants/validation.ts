/**
 * Tenants feature Zod schemas.
 */

import { z } from "zod";

const slugSchema = z
  .string()
  .min(1, "Slug is required")
  .max(100)
  .regex(
    /^[a-z0-9-]+$/,
    "Slug must be lowercase letters, numbers, and hyphens",
  );

export const CreateTenantSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  slug: slugSchema,
});

export const UpdateTenantSchema = CreateTenantSchema.partial();

export const PlanTierSchema = z.enum([
  "STARTER",
  "PROFESSIONAL",
  "ENTERPRISE",
]);

export const SubscriptionStatusSchema = z.enum([
  "TRIAL",
  "ACTIVE",
  "PAST_DUE",
  "SUSPENDED",
  "LOCKED",
  "CANCELLED",
]);

/** Form schema for creating a tenant with admin user */
export const TenantCreateFormSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(200),
  slug: slugSchema,
  plan: PlanTierSchema.default("STARTER"),
  adminUsername: z.string().min(1, "Admin username is required").max(100),
  adminPassword: z
    .string()
    .min(1, "Admin password is required")
    .min(6, "Password must be at least 6 characters"),
});

/** Form schema for editing a tenant */
export const TenantEditFormSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(200),
  slug: slugSchema,
  isActive: z.boolean(),
  subscriptionStatus: SubscriptionStatusSchema,
});

export type CreateTenantInput = z.infer<typeof CreateTenantSchema>;
export type UpdateTenantInput = z.infer<typeof UpdateTenantSchema>;
export type TenantCreateFormInput = z.infer<typeof TenantCreateFormSchema>;
export type TenantEditFormInput = z.infer<typeof TenantEditFormSchema>;
