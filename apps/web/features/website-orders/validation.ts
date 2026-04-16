/**
 * Form validation for the admin-side Reject + Convert actions.
 *
 * The backend re-validates everything on its side (the zod schemas in
 * apps/api/src/modules/website-orders/website-orders.schema.ts are the
 * source of truth). These client schemas are for the shadcn forms only
 * and mirror the server shape so error messages show up inline without
 * a round-trip.
 */

import { z } from "zod";

export const RejectOrderFormSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Reason is required")
    .max(500, "Reason is too long (500 characters max)"),
});

export type RejectOrderFormInput = z.infer<typeof RejectOrderFormSchema>;

export const ConvertOrderPaymentSchema = z.object({
  method: z.string().trim().min(1, "Method is required").max(32),
  amount: z.coerce.number().nonnegative("Amount must be >= 0"),
});

export const ConvertOrderFormSchema = z
  .object({
    locationId: z.string().uuid("Select a showroom"),
    isCreditSale: z.boolean().optional().default(false),
    payments: z.array(ConvertOrderPaymentSchema).optional(),
    itemLocationOverrides: z
      .array(
        z.object({
          productId: z.string().uuid(),
          sourceLocationId: z.string().uuid(),
        }),
      )
      .optional(),
  })
  .refine(
    (v) => {
      // A credit sale doesn't need payments. Otherwise we need at least one.
      if (v.isCreditSale) return true;
      return (v.payments?.length ?? 0) > 0;
    },
    {
      message: "Add at least one payment, or mark the sale as credit.",
      path: ["payments"],
    },
  );

export type ConvertOrderFormInput = z.infer<typeof ConvertOrderFormSchema>;

/** Pretty-print a minor-unit money value with the tenant's currency. */
export function formatMoney(value: string | number, currency = "NPR"): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return String(value);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString("en-IN")}`;
  }
}
