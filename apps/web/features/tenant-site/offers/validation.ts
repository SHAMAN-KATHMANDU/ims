import { z } from "zod";

export const CreateOfferSchema = z.object({
  code: z.string().min(1, "Code is required").max(50),
  title: z.string().min(1, "Title is required").max(200),
  type: z.enum(["Discount", "Comp", "Event", "Freeshipment"]),
  value: z.string().min(1, "Value is required"),
  appliesToAll: z.boolean(),
  appliesTo: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  maxUses: z.string().optional(),
  perCustomerLimit: z.string().optional(),
});

export type CreateOfferInput = z.infer<typeof CreateOfferSchema>;

export const UpdateOfferSchema = CreateOfferSchema.partial();
export type UpdateOfferInput = z.infer<typeof UpdateOfferSchema>;

export const OfferFormSchema = z.object({
  code: z.string().min(1, "Code is required"),
  title: z.string().min(1, "Title is required"),
  type: z.enum(["Discount", "Comp", "Event", "Freeshipment"]),
  value: z.string().min(1, "Value is required"),
  appliesToAll: z.boolean(),
  appliesTo: z.array(z.string()),
  startDate: z.string(),
  endDate: z.string(),
  maxUses: z.string(),
  perCustomerLimit: z.string(),
});

export type OfferFormInput = z.infer<typeof OfferFormSchema>;
