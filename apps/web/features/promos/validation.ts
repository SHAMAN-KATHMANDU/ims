/**
 * Promos feature Zod schemas.
 */

import { z } from "zod";

export const CreatePromoSchema = z.object({
  code: z.string().min(1, "Code is required").max(50),
  description: z.string().max(500).optional(),
  valueType: z.enum(["PERCENTAGE", "FLAT"]),
  value: z.coerce.number().min(0),
  overrideDiscounts: z.boolean().optional().default(false),
  allowStacking: z.boolean().optional().default(false),
  eligibility: z
    .enum(["ALL", "MEMBER", "NON_MEMBER", "WHOLESALE"])
    .optional()
    .default("ALL"),
  validFrom: z.string().datetime().optional().nullable(),
  validTo: z.string().datetime().optional().nullable(),
  usageLimit: z.coerce.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  productIds: z.array(z.string().uuid()).optional(),
});

/** Form schema - accepts date strings (YYYY-MM-DD) for validFrom/validTo, empty string for usageLimit */
export const PromoFormSchema = z.object({
  code: z.string().min(1, "Code is required").max(50),
  description: z.string().max(500).optional(),
  valueType: z.enum(["PERCENTAGE", "FLAT"]),
  value: z.coerce.number().min(0, "Value must be 0 or greater"),
  overrideDiscounts: z.boolean().optional().default(false),
  allowStacking: z.boolean().optional().default(false),
  eligibility: z
    .enum(["ALL", "MEMBER", "NON_MEMBER", "WHOLESALE"])
    .optional()
    .default("ALL"),
  validFrom: z.string().optional().nullable(),
  validTo: z.string().optional().nullable(),
  usageLimit: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
    z.number().int().positive().optional(),
  ),
  isActive: z.boolean().optional().default(true),
  productIds: z.array(z.string().uuid()).optional().default([]),
  applyToAll: z.boolean().optional().default(false),
  categoryIds: z.array(z.string()).optional().default([]),
  subCategories: z.array(z.string()).optional().default([]),
});

export const UpdatePromoSchema = CreatePromoSchema.partial();

export type CreatePromoInput = z.infer<typeof CreatePromoSchema>;
export type UpdatePromoInput = z.infer<typeof UpdatePromoSchema>;
export type PromoFormInput = z.infer<typeof PromoFormSchema>;
