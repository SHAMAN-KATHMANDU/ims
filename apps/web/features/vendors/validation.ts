/**
 * Vendors feature Zod schemas.
 */

import { z } from "zod";

export const CreateVendorSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  contact: z.string().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
});

export const UpdateVendorSchema = CreateVendorSchema.partial();

export type CreateVendorInput = z.infer<typeof CreateVendorSchema>;
export type UpdateVendorInput = z.infer<typeof UpdateVendorSchema>;
