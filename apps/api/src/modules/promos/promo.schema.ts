import { z } from "zod";

const promoValueTypeSchema = z.enum(["PERCENTAGE", "FLAT"]);
const promoEligibilitySchema = z.enum([
  "ALL",
  "MEMBER",
  "NON_MEMBER",
  "WHOLESALE",
]);

const optionalStringArray = z.array(z.string().trim().min(1)).optional();

export const createPromoSchema = z.object({
  code: z.string().trim().min(1, "Promo code is required"),
  description: z.string().trim().optional(),
  valueType: promoValueTypeSchema,
  value: z.coerce.number(),
  overrideDiscounts: z.boolean().optional(),
  allowStacking: z.boolean().optional(),
  eligibility: promoEligibilitySchema.optional(),
  validFrom: z.coerce.date().optional().nullable(),
  validTo: z.coerce.date().optional().nullable(),
  usageLimit: z.coerce.number().int().optional().nullable(),
  isActive: z.boolean().optional(),
  productIds: optionalStringArray,
  applyToAll: z.boolean().optional(),
  categoryIds: optionalStringArray,
  subCategories: optionalStringArray,
});

export const updatePromoSchema = z.object({
  code: z.string().trim().min(1).optional(),
  description: z.string().trim().optional().nullable(),
  valueType: promoValueTypeSchema.optional(),
  value: z.coerce.number().optional(),
  overrideDiscounts: z.boolean().optional(),
  allowStacking: z.boolean().optional(),
  eligibility: promoEligibilitySchema.optional(),
  validFrom: z.coerce.date().optional().nullable(),
  validTo: z.coerce.date().optional().nullable(),
  usageLimit: z.coerce.number().int().optional().nullable(),
  isActive: z.boolean().optional(),
  productIds: optionalStringArray,
  applyToAll: z.boolean().optional(),
  categoryIds: optionalStringArray,
  subCategories: optionalStringArray,
});

export const promoIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Promo ID is required"),
});

export const promoListQuerySchema = z.object({
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
  search: z.string().trim().optional(),
  sortBy: z
    .enum(["code", "createdAt", "updatedAt", "validFrom", "validTo"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});
