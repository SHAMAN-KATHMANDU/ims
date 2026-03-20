/**
 * Sales feature Zod schemas.
 * Extract from form components as needed.
 */

import { z } from "zod";

const saleItemDiscountFields = {
  variationId: z.string().min(1, "Variation is required"),
  subVariationId: z.string().nullable().optional(),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  discountId: z.string().nullable().optional(),
  promoCode: z.string().optional(),
  manualDiscountPercent: z.number().min(0).max(100).optional(),
  manualDiscountAmount: z.number().min(0).optional(),
  discountReason: z.string().max(500).optional(),
};

export const CreateSaleItemSchema = z
  .object(saleItemDiscountFields)
  .refine(
    (data) =>
      !(
        data.manualDiscountPercent != null &&
        data.manualDiscountAmount != null
      ),
    {
      message: "Provide either manual discount percent or amount, not both",
      path: ["manualDiscountAmount"],
    },
  )
  .refine(
    (data) => {
      const hasManual =
        (data.manualDiscountPercent != null && data.manualDiscountPercent > 0) ||
        (data.manualDiscountAmount != null && data.manualDiscountAmount > 0);
      if (!hasManual) return true;
      return (
        typeof data.discountReason === "string" &&
        data.discountReason.trim().length > 0
      );
    },
    {
      message: "Discount reason is required when applying manual discount",
      path: ["discountReason"],
    },
  );

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
