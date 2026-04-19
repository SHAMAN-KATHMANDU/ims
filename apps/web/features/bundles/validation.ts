/**
 * Bundle feature Zod schemas. Mirrors apps/api/src/modules/bundles/bundle.schema.ts.
 */

import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const pricingStrategySchema = z.enum(["SUM", "DISCOUNT_PCT", "FIXED"]);

function refinePricing(
  value: {
    pricingStrategy?: "SUM" | "DISCOUNT_PCT" | "FIXED";
    discountPct?: number | null;
    fixedPrice?: number | null;
  },
  ctx: z.RefinementCtx,
) {
  if (value.pricingStrategy === "DISCOUNT_PCT") {
    if (value.discountPct === undefined || value.discountPct === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "discountPct is required when pricingStrategy is DISCOUNT_PCT",
        path: ["discountPct"],
      });
    }
  }
  if (value.pricingStrategy === "FIXED") {
    if (value.fixedPrice === undefined || value.fixedPrice === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "fixedPrice is required when pricingStrategy is FIXED",
        path: ["fixedPrice"],
      });
    }
  }
}

export const CreateBundleSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(200),
    slug: z
      .string()
      .min(1, "Slug is required")
      .max(200)
      .regex(
        slugPattern,
        "Slug must be lowercase letters, numbers, and hyphens",
      ),
    description: z.string().max(5000).optional().nullable(),
    productIds: z
      .array(z.string().uuid("Invalid product id"))
      .min(1, "Select at least one product")
      .max(100, "At most 100 products"),
    pricingStrategy: pricingStrategySchema.default("SUM"),
    discountPct: z.coerce.number().int().min(0).max(100).optional().nullable(),
    fixedPrice: z.coerce.number().int().min(0).optional().nullable(),
    active: z.boolean().optional().default(true),
  })
  .superRefine(refinePricing);

/** Form schema - accepts empty strings for optional numeric fields */
export const BundleFormSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(200),
    slug: z
      .string()
      .min(1, "Slug is required")
      .max(200)
      .regex(
        slugPattern,
        "Slug must be lowercase letters, numbers, and hyphens",
      ),
    description: z.string().max(5000).optional(),
    productIds: z
      .array(z.string().uuid("Invalid product id"))
      .min(1, "Select at least one product")
      .max(100, "At most 100 products"),
    pricingStrategy: pricingStrategySchema,
    discountPct: z.preprocess(
      (v) =>
        v === "" || v === undefined || v === null ? undefined : Number(v),
      z.number().int().min(0).max(100).optional(),
    ),
    fixedPrice: z.preprocess(
      (v) =>
        v === "" || v === undefined || v === null ? undefined : Number(v),
      z.number().int().min(0).optional(),
    ),
    active: z.boolean().default(true),
  })
  .superRefine(refinePricing);

export const UpdateBundleSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    slug: z.string().min(1).max(200).regex(slugPattern).optional(),
    description: z.string().max(5000).optional().nullable(),
    productIds: z.array(z.string().uuid()).min(1).max(100).optional(),
    pricingStrategy: pricingStrategySchema.optional(),
    discountPct: z.coerce.number().int().min(0).max(100).optional().nullable(),
    fixedPrice: z.coerce.number().int().min(0).optional().nullable(),
    active: z.boolean().optional(),
  })
  .superRefine(refinePricing);

export type CreateBundleInput = z.infer<typeof CreateBundleSchema>;
export type UpdateBundleInput = z.infer<typeof UpdateBundleSchema>;
export type BundleFormInput = z.infer<typeof BundleFormSchema>;
