import { z } from "zod";

export const adjustInventorySchema = z.object({
  locationId: z.string().trim().min(1, "Location ID is required"),
  variationId: z.string().trim().min(1, "Variation ID is required"),
  subVariationId: z.string().trim().min(1).optional().or(z.literal(null)),
  quantity: z.coerce
    .number()
    .int("Quantity must be an integer")
    .refine((n) => n !== 0, "Quantity cannot be zero"),
  reason: z.string().trim().optional(),
});

export const setInventorySchema = z.object({
  locationId: z.string().trim().min(1, "Location ID is required"),
  variationId: z.string().trim().min(1, "Variation ID is required"),
  subVariationId: z.string().trim().min(1).optional().or(z.literal(null)),
  quantity: z.coerce
    .number()
    .int("Quantity must be an integer")
    .min(0, "Quantity must be a non-negative number"),
});

export const inventoryLocationParamsSchema = z.object({
  locationId: z.string().trim().min(1, "Location ID is required"),
});

export const inventoryProductParamsSchema = z.object({
  productId: z.string().trim().min(1, "Product ID is required"),
});

export const locationInventoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
  search: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
});

export type AdjustInventorySchema = z.infer<typeof adjustInventorySchema>;
export type SetInventorySchema = z.infer<typeof setInventorySchema>;
