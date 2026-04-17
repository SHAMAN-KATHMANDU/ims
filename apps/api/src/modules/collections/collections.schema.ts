/**
 * Zod schemas for the collections admin API. Slugs are URL-safe ASCII so
 * public URLs like /collections/<slug> stay portable across hostnames.
 */

import { z } from "zod";

export const SlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, digits, and hyphens only",
  );

export const CreateCollectionSchema = z.object({
  slug: SlugSchema,
  title: z.string().trim().min(1).max(120),
  subtitle: z
    .string()
    .trim()
    .max(300)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  sort: z.number().int().min(0).max(1000).optional(),
  isActive: z.boolean().optional(),
});

export const UpdateCollectionSchema = z
  .object({
    slug: SlugSchema.optional(),
    title: z.string().trim().min(1).max(120).optional(),
    subtitle: z.string().trim().max(300).nullable().optional(),
    sort: z.number().int().min(0).max(1000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (v) => Object.values(v).some((x) => x !== undefined),
    "At least one field required",
  );

export const SetCollectionProductsSchema = z.object({
  /** Ordered list of product IDs — replaces the current membership. */
  productIds: z.array(z.string().uuid()).max(200),
});

export type CreateCollectionInput = z.infer<typeof CreateCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof UpdateCollectionSchema>;
export type SetCollectionProductsInput = z.infer<
  typeof SetCollectionProductsSchema
>;
