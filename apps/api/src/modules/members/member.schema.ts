import { z } from "zod";
import { parseAndValidatePhone } from "@/utils/phone";

/** Transforms and validates phone to E.164. */
const phoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .transform((val) => {
    const result = parseAndValidatePhone(val);
    if (!result.valid) {
      const err = result as { valid: false; message: string };
      throw new Error(err.message);
    }
    return result.e164;
  });

/** For create: empty/undefined -> null. */
const optionalStringNull = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .optional()
  .transform((v) =>
    v === "" || v === null || v === undefined ? null : String(v),
  );

/** For update: undefined passes through (no update), ""/null -> null. */
const optionalStringNullUpdate = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v) =>
    v === undefined ? undefined : v === "" || v === null ? null : String(v),
  );

export const CreateMemberSchema = z.object({
  phone: phoneSchema,
  name: optionalStringNull,
  email: optionalStringNull,
  notes: optionalStringNull,
});

export const UpdateMemberSchema = z.object({
  phone: phoneSchema.optional(),
  name: optionalStringNullUpdate,
  email: optionalStringNullUpdate,
  notes: optionalStringNullUpdate,
  isActive: z.coerce.boolean().optional(),
});

export type CreateMemberDto = z.infer<typeof CreateMemberSchema>;
export type UpdateMemberDto = z.infer<typeof UpdateMemberSchema>;
