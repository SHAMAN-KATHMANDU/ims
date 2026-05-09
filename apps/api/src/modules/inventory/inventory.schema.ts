import { z } from "zod";

export const AdjustInventorySchema = z.object({
  locationId: z.string().min(1, "Location ID is required"),
  variationId: z.string().min(1, "Variation ID is required"),
  subVariationId: z.string().uuid().optional().nullable(),
  quantity: z.coerce.number().int(),
  reason: z.string().optional(),
});

export const SetInventorySchema = z.object({
  locationId: z.string().min(1, "Location ID is required"),
  variationId: z.string().min(1, "Variation ID is required"),
  subVariationId: z.string().uuid().optional().nullable(),
  quantity: z.coerce
    .number()
    .int()
    .min(0, "Quantity must be non-negative")
    .max(2147483647, "Quantity exceeds maximum allowed value"),
});

export const GetLocationInventoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  sortBy: z.enum(["name", "price", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export type AdjustInventoryDto = z.infer<typeof AdjustInventorySchema>;
export type SetInventoryDto = z.infer<typeof SetInventorySchema>;
export type GetLocationInventoryQuery = z.infer<
  typeof GetLocationInventoryQuerySchema
>;
