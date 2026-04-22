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
        data.manualDiscountPercent != null && data.manualDiscountAmount != null
      ),
    {
      message: "Provide either manual discount percent or amount, not both",
      path: ["manualDiscountAmount"],
    },
  )
  .refine(
    (data) => {
      const hasManual =
        (data.manualDiscountPercent != null &&
          data.manualDiscountPercent > 0) ||
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

/**
 * Schema for a single payment row (draft entry before being appended to the
 * payments array).
 */
export const PaymentEntrySchema = z.object({
  id: z.string(),
  method: z.string().min(1, "Payment method is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
});

/** Full schema for the NewSaleForm — covers every managed field. */
export const NewSaleFormSchema = z.object({
  locationId: z.string().min(1, "Select a location to record the sale"),
  memberPhone: z.string().optional(),
  memberName: z.string().optional(),
  contactId: z.string().nullable().optional(),
  notes: z.string().max(2000).optional(),
  isCreditSale: z.boolean().optional(),
  items: z
    .array(CreateSaleItemSchema)
    .min(1, "Add at least one product to the cart"),
  /**
   * Defaults to [] so that trigger() on the minimal legacy form state
   * (locationId + items) still passes before tasks 2b-3/4 wire payments into RHF.
   */
  payments: z.array(PaymentEntrySchema).default([]),
  promoCode: z.string().optional(),
  /**
   * Defaults to "individual" so trigger() passes before task 2b-3 registers it.
   */
  discountMode: z.enum(["individual", "aggregate"]).default("individual"),
  aggregateDiscountAmount: z.number().nonnegative().default(0),
  /** Draft state: the payment method selected for the next payment row */
  selectedPaymentMethod: z.string().optional(),
  /** Draft state: the amount typed for the next payment row (kept as string in the input) */
  paymentAmount: z.string().optional(),
});

export type CreateSaleItemInput = z.infer<typeof CreateSaleItemSchema>;
export type PaymentEntryInput = z.infer<typeof PaymentEntrySchema>;
export type NewSaleFormInput = z.infer<typeof NewSaleFormSchema>;
