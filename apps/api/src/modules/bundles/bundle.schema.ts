import { z } from "zod";

const pricingStrategySchema = z.enum(["SUM", "DISCOUNT_PCT", "FIXED"]);

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const slugSchema = z
  .string()
  .min(1, "Slug is required")
  .max(200)
  .transform((s) => s.trim().toLowerCase())
  .refine(
    (s) => slugPattern.test(s),
    "Slug must be lowercase alphanumerics separated by single hyphens",
  );

const productIdsSchema = z
  .array(z.string().uuid("productIds must be UUIDs"))
  .max(100, "Too many products in bundle");

const baseShape = {
  name: z.string().min(1, "Name is required").max(200),
  slug: slugSchema,
  description: z.string().max(5000).nullish(),
  productIds: productIdsSchema,
  pricingStrategy: pricingStrategySchema.default("SUM"),
  discountPct: z.coerce.number().int().min(0).max(100).nullish(),
  fixedPrice: z.coerce.number().int().min(0).nullish(),
  active: z.coerce.boolean().default(true),
};

function refinePricing<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.superRefine((val, ctx) => {
    const v = val as {
      pricingStrategy?: "SUM" | "DISCOUNT_PCT" | "FIXED";
      discountPct?: number | null;
      fixedPrice?: number | null;
    };
    if (v.pricingStrategy === "DISCOUNT_PCT") {
      if (v.discountPct === undefined || v.discountPct === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["discountPct"],
          message:
            "discountPct is required when pricingStrategy is DISCOUNT_PCT",
        });
      }
    }
    if (v.pricingStrategy === "FIXED") {
      if (v.fixedPrice === undefined || v.fixedPrice === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fixedPrice"],
          message: "fixedPrice is required when pricingStrategy is FIXED",
        });
      }
    }
  });
}

export const CreateBundleSchema = refinePricing(z.object(baseShape));

export const UpdateBundleSchema = refinePricing(
  z.object({
    name: baseShape.name.optional(),
    slug: slugSchema.optional(),
    description: z.string().max(5000).nullish(),
    productIds: productIdsSchema.optional(),
    pricingStrategy: pricingStrategySchema.optional(),
    discountPct: z.coerce.number().int().min(0).max(100).nullish(),
    fixedPrice: z.coerce.number().int().min(0).nullish(),
    active: z.coerce.boolean().optional(),
  }),
);

export const BundleListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  active: z
    .string()
    .optional()
    .transform((v) =>
      v === "true" ? true : v === "false" ? false : undefined,
    ),
});

export type CreateBundleDto = z.infer<typeof CreateBundleSchema>;
export type UpdateBundleDto = z.infer<typeof UpdateBundleSchema>;
export type BundleListQuery = z.infer<typeof BundleListQuerySchema>;
