import { z } from "zod";

export interface CheckoutFormProps {
  showOrderSummary?: boolean;
  submitButtonLabel?: string;
}

export const CheckoutFormSchema = z
  .object({
    showOrderSummary: z.boolean().optional(),
    submitButtonLabel: z.string().trim().max(100).optional(),
  })
  .strict();

export type CheckoutFormInput = z.infer<typeof CheckoutFormSchema>;
