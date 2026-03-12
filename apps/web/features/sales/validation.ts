/**
 * Sales feature Zod schemas.
 * Extract from form components as needed.
 */

import { z } from "zod";

export const CreateSaleItemSchema = z.object({
  variationId: z.string().min(1, "Variation is required"),
  subVariationId: z.string().nullable().optional(),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  discountId: z.string().nullable().optional(),
  promoCode: z.string().optional(),
});

/** Schema for NewSaleForm critical fields - location and items required */
export const NewSaleFormSchema = z.object({
  locationId: z.string().min(1, "Select a location to record the sale"),
  items: z
    .array(
      z.object({
        variationId: z.string(),
        subVariationId: z.string().nullable().optional(),
        quantity: z.number().positive(),
      }),
    )
    .min(1, "Add at least one product to the cart"),
});

export type CreateSaleItemInput = z.infer<typeof CreateSaleItemSchema>;
export type NewSaleFormInput = z.infer<typeof NewSaleFormSchema>;
