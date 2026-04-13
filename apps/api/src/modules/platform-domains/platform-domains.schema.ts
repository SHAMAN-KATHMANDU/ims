/**
 * Zod schemas for platform-admin tenant domain management.
 */

import { z } from "zod";

const hostnameRegex =
  /^(?=.{1,253}$)(?:(?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{2,63}$/;

export const hostnameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(253)
  .regex(hostnameRegex, "Invalid hostname");

export const appTypeSchema = z.enum(["WEBSITE", "IMS", "API"]);

export const CreateTenantDomainSchema = z.object({
  hostname: hostnameSchema,
  appType: appTypeSchema,
  isPrimary: z.boolean().optional().default(false),
});

export const UpdateTenantDomainSchema = z.object({
  appType: appTypeSchema.optional(),
  isPrimary: z.boolean().optional(),
});

export const ListTenantDomainsQuerySchema = z.object({
  appType: appTypeSchema.optional(),
});

export type CreateTenantDomainInput = z.infer<typeof CreateTenantDomainSchema>;
export type UpdateTenantDomainInput = z.infer<typeof UpdateTenantDomainSchema>;
export type ListTenantDomainsQuery = z.infer<
  typeof ListTenantDomainsQuerySchema
>;
