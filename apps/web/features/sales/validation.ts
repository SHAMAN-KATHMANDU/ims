/**
 * Sales feature Zod schemas.
 * Extract from form components as needed.
 */

import { z } from "zod";

// Placeholder - NewSaleForm has complex inline validation
// Add schemas when extracting form validation
export const CreateSaleItemSchema = z.object({
  variationId: z.string().min(1, "Variation is required"),
  subVariationId: z.string().nullable().optional(),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  discountId: z.string().nullable().optional(),
  promoCode: z.string().optional(),
});

export type CreateSaleItemInput = z.infer<typeof CreateSaleItemSchema>;
