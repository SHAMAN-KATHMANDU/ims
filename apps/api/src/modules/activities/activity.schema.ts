import { z } from "zod";

export const ACTIVITY_TYPES = ["CALL", "MEETING"] as const;
export const ActivityTypeSchema = z.enum(ACTIVITY_TYPES);

export const CreateActivitySchema = z
  .object({
    type: ActivityTypeSchema,
    subject: z
      .string()
      .max(500)
      .optional()
      .transform((v) => v?.trim() || null),
    notes: z
      .string()
      .optional()
      .transform((v) => v?.trim() || null),
    activityAt: z.string().datetime().or(z.date()).optional(),
    contactId: z.string().uuid().optional().nullable(),
    memberId: z.string().uuid().optional().nullable(),
    dealId: z.string().uuid().optional().nullable(),
  })
  .refine((data) => !!(data.contactId ?? data.memberId ?? data.dealId), {
    message: "Either contactId, memberId, or dealId is required",
    path: ["contactId"],
  });

export type CreateActivityDto = z.infer<typeof CreateActivitySchema>;
