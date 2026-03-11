/**
 * Transfers feature Zod schemas.
 */

import { z } from "zod";

export const TransferItemSchema = z.object({
  variationId: z.string().uuid(),
  subVariationId: z.string().uuid().optional().nullable(),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
});

export const CreateTransferSchema = z.object({
  fromLocationId: z.string().uuid("Invalid from location"),
  toLocationId: z.string().uuid("Invalid to location"),
  items: z.array(TransferItemSchema).min(1, "At least one item required"),
  notes: z.string().max(500).optional(),
});

export type CreateTransferInput = z.infer<typeof CreateTransferSchema>;
