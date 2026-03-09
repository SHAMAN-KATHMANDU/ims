import { z } from "zod";

export const CreateVendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required").max(200),
  contact: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
});

export const UpdateVendorSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  contact: z.string().max(200).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
});

export type CreateVendorDto = z.infer<typeof CreateVendorSchema>;
export type UpdateVendorDto = z.infer<typeof UpdateVendorSchema>;
