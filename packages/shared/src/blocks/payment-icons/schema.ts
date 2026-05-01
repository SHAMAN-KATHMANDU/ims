import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Payment icons — Visa, MC, PayPal, Apple Pay, etc.
 */
export interface PaymentIconsProps {
  items?: Array<{
    name: string;
  }>;
  variant?: "flat" | "outlined";
  align?: "start" | "center" | "end";
}

/**
 * Zod schema for payment-icons props validation.
 */
export const PaymentIconsSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            name: str(100),
          })
          .strict(),
      )
      .optional(),
    variant: z.enum(["flat", "outlined"]).optional(),
    align: z.enum(["start", "center", "end"]).optional(),
  })
  .strict();

export type PaymentIconsInput = z.infer<typeof PaymentIconsSchema>;
