/**
 * Promos feature Zod schemas.
 */

import { z } from "zod";

export const CreatePromoSchema = z.object({
  code: z.string().min(1, "Code is required").max(50),
  description: z.string().max(500).optional(),
  valueType: z.enum(["PERCENTAGE", "FLAT"]),
  value: z.coerce.number().min(0),
  overrideDiscounts: z.boolean().optional().default(false),
  allowStacking: z.boolean().optional().default(false),
  eligibility: z
    .enum(["ALL", "MEMBER", "NON_MEMBER", "WHOLESALE"])
    .optional()
    .default("ALL"),
  validFrom: z.string().datetime().optional().nullable(),
  validTo: z.string().datetime().optional().nullable(),
  usageLimit: z.coerce.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  productIds: z.array(z.string().uuid()).optional(),
});

export const UpdatePromoSchema = CreatePromoSchema.partial();

export type CreatePromoInput = z.infer<typeof CreatePromoSchema>;
export type UpdatePromoInput = z.infer<typeof UpdatePromoSchema>;
