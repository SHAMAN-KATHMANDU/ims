import { z } from "zod";

const optionalTrimmedString = z.string().trim().min(1).optional();
const optionalNullableId = z.string().trim().min(1).nullable().optional();

export const createActivitySchema = z
  .object({
    type: z.enum(["CALL", "MEETING"], {
      errorMap: () => ({
        message: "Valid type (CALL, MEETING) is required",
      }),
    }),
    subject: optionalTrimmedString,
    notes: optionalTrimmedString,
    activityAt: z.string().datetime().nullable().optional(),
    contactId: optionalNullableId,
    memberId: optionalNullableId,
    dealId: optionalNullableId,
  })
  .refine(
    (v) => Boolean(v.contactId || v.memberId || v.dealId),
    "Either contactId, memberId, or dealId is required",
  );

export const activityIdParamsSchema = z.object({
  id: z.string().uuid("Invalid activity id"),
});

export const contactIdParamsSchema = z.object({
  contactId: z.string().uuid("Invalid contact id"),
});

export const dealIdParamsSchema = z.object({
  dealId: z.string().uuid("Invalid deal id"),
});
