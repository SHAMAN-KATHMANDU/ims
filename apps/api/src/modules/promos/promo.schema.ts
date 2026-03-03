import { z } from "zod";

const valueTypeSchema = z.enum(["PERCENTAGE", "FLAT"]);
const eligibilitySchema = z.enum(["ALL", "MEMBER", "NON_MEMBER", "WHOLESALE"]);

const optionalStringNull = z
  .union([z.string(), z.null(), z.undefined()])
  .optional()
  .transform((v) =>
    v === "" || v === null || v === undefined ? null : String(v),
  );

const optionalStringNullUpdate = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) =>
    v === undefined ? undefined : v === "" || v === null ? null : String(v),
  );

const optionalDate = z
  .union([z.string(), z.date(), z.null(), z.undefined()])
  .optional()
  .transform((v) =>
    v === "" || v === null || v === undefined
      ? null
      : new Date(v as string | Date),
  );

const optionalDateUpdate = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .transform((v) =>
    v === undefined
      ? undefined
      : v === "" || v === null
        ? null
        : new Date(v as string | Date),
  );

export const CreatePromoSchema = z.object({
  code: z
    .string()
    .min(1, "Promo code is required")
    .transform((s) => s.trim()),
  description: optionalStringNull,
  valueType: valueTypeSchema,
  value: z.coerce.number(),
  overrideDiscounts: z.coerce.boolean().default(false),
  allowStacking: z.coerce.boolean().default(false),
  eligibility: eligibilitySchema.default("ALL"),
  validFrom: optionalDate,
  validTo: optionalDate,
  usageLimit: z
    .union([z.coerce.number().int().positive(), z.literal(null)])
    .optional()
    .transform((v) => (v === undefined ? null : v)),
  isActive: z.coerce.boolean().default(true),
  productIds: z.array(z.string().uuid()).optional(),
  applyToAll: z.boolean().optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  subCategories: z.array(z.string()).optional(),
});

export const UpdatePromoSchema = z.object({
  code: z
    .string()
    .min(1, "Promo code cannot be empty")
    .transform((s) => s.trim())
    .optional(),
  description: optionalStringNullUpdate,
  valueType: valueTypeSchema.optional(),
  value: z.coerce.number().optional(),
  overrideDiscounts: z.coerce.boolean().optional(),
  allowStacking: z.coerce.boolean().optional(),
  eligibility: eligibilitySchema.optional(),
  validFrom: optionalDateUpdate,
  validTo: optionalDateUpdate,
  usageLimit: z
    .union([z.coerce.number().int().positive(), z.literal(null)])
    .optional(),
  isActive: z.coerce.boolean().optional(),
  productIds: z.array(z.string().uuid()).optional(),
  applyToAll: z.boolean().optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  subCategories: z.array(z.string()).optional(),
});

export const PromoListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  search: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((v) =>
      v === "true" ? true : v === "false" ? false : undefined,
    ),
});

export type CreatePromoDto = z.infer<typeof CreatePromoSchema>;
export type UpdatePromoDto = z.infer<typeof UpdatePromoSchema>;
export type PromoListQuery = z.infer<typeof PromoListQuerySchema>;
