/**
 * Members feature Zod schemas.
 */

import { z } from "zod";

export const CreateMemberSchema = z.object({
  phone: z.string().min(1, "Phone is required"),
  name: z.string().max(200).optional(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().max(1000).optional(),
  gender: z.string().max(50).optional(),
  age: z.coerce.number().int().min(0).max(150).optional(),
  address: z.string().max(500).optional(),
  birthday: z.string().optional(),
});

export const UpdateMemberSchema = CreateMemberSchema.partial().extend({
  isActive: z.boolean().optional(),
  memberStatus: z.enum(["ACTIVE", "INACTIVE", "PROSPECT", "VIP"]).optional(),
});

export type CreateMemberInput = z.infer<typeof CreateMemberSchema>;
export type UpdateMemberInput = z.infer<typeof UpdateMemberSchema>;
