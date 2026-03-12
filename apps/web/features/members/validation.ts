/**
 * Members feature Zod schemas.
 */

import { z } from "zod";

const optionalAgeSchema = z.preprocess(
  (val) => (val === "" || val === undefined ? undefined : Number(val)),
  z.number().int().min(0, "Age must be 0-150").max(150, "Age must be 0-150").optional(),
);

export const CreateMemberSchema = z.object({
  phone: z.string().min(1, "Phone is required"),
  name: z.string().max(200).optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  notes: z.string().max(1000).optional(),
  gender: z.string().max(50).optional(),
  age: optionalAgeSchema,
  address: z.string().max(500).optional(),
  birthday: z.string().optional(),
});

export const UpdateMemberSchema = CreateMemberSchema.partial().extend({
  isActive: z.boolean().optional(),
  memberStatus: z.enum(["ACTIVE", "INACTIVE", "PROSPECT", "VIP"]).optional(),
});

/** Form schema for create/edit - includes edit-only fields as optional */
export const MemberFormSchema = CreateMemberSchema.extend({
  isActive: z.boolean().optional(),
  memberStatus: z.enum(["ACTIVE", "INACTIVE", "PROSPECT", "VIP"]).optional(),
});

export type CreateMemberInput = z.infer<typeof CreateMemberSchema>;
export type UpdateMemberInput = z.infer<typeof UpdateMemberSchema>;
export type MemberFormInput = z.infer<typeof MemberFormSchema>;
