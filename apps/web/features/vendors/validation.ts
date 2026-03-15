/**
 * Vendors feature Zod schemas.
 */

import { z } from "zod";
import { parseAndValidatePhone } from "@/lib/phone";

const phoneRefine = (data: { phone?: string | null }) => {
  const p = data.phone?.trim();
  if (!p) return true;
  return parseAndValidatePhone(p).valid;
};

const VendorBaseSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  contact: z.string().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
});

export const CreateVendorSchema = VendorBaseSchema.refine(phoneRefine, {
  message: "Please enter a valid phone number",
  path: ["phone"],
});

export const UpdateVendorSchema = VendorBaseSchema.partial().refine(
  phoneRefine,
  { message: "Please enter a valid phone number", path: ["phone"] },
);

export type CreateVendorInput = z.infer<typeof CreateVendorSchema>;
export type UpdateVendorInput = z.infer<typeof UpdateVendorSchema>;
