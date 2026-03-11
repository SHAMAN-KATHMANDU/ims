/**
 * Products feature Zod schemas.
 */

import { z } from "zod";

export const CreateProductSchema = z.object({
  imsCode: z.string().min(1, "IMS Code is required").max(50),
  name: z.string().min(1, "Name is required").max(200),
  categoryId: z.string().uuid("Invalid category"),
  description: z.string().max(2000).optional(),
  costPrice: z.coerce.number().min(0),
  mrp: z.coerce.number().min(0),
  vendorId: z.string().uuid().optional().nullable(),
});

export const UpdateProductSchema = CreateProductSchema.partial();

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
