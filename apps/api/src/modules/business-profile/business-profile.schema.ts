import { z } from "zod";

/**
 * PATCH /me/business-profile — every field optional.
 * Max-lengths mirror the @db.VarChar annotations in the Prisma schema.
 */
export const UpdateBusinessProfileSchema = z.object({
  legalName: z.string().max(255).optional().nullable(),
  displayName: z.string().max(255).optional().nullable(),
  tagline: z.string().max(255).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  faviconUrl: z.string().url().optional().nullable(),

  email: z.string().email().optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  alternatePhone: z.string().max(40).optional().nullable(),
  websiteUrl: z.string().url().optional().nullable(),

  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(120).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/, "Must be 2-letter ISO 3166-1 alpha-2 code")
    .optional()
    .nullable(),
  mapUrl: z.string().url().optional().nullable(),

  panNumber: z.string().max(20).optional().nullable(),
  vatNumber: z.string().max(20).optional().nullable(),
  registrationNumber: z.string().max(40).optional().nullable(),
  taxId: z.string().max(40).optional().nullable(),

  defaultCurrency: z.string().max(8).optional(),
  timezone: z.string().max(64).optional().nullable(),

  socials: z.record(z.string()).optional().nullable(),
});

export type UpdateBusinessProfileDto = z.infer<
  typeof UpdateBusinessProfileSchema
>;
