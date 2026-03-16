import { z } from "zod";

export const ACTIVITY_TYPES = ["CALL", "EMAIL", "MEETING"] as const;
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

/** Query for GET activities by contact/deal. When both absent, API returns all. */
const listActivitiesQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) =>
      v === undefined || v === "" ? undefined : Math.max(1, parseInt(v) || 1),
    ),
  limit: z
    .string()
    .optional()
    .transform((v) =>
      v === undefined || v === ""
        ? undefined
        : Math.min(100, Math.max(1, parseInt(v) || 10)),
    ),
  type: ActivityTypeSchema.optional(),
});

export const ListActivitiesByContactQuerySchema = listActivitiesQuerySchema;
export const ListActivitiesByDealQuerySchema = listActivitiesQuerySchema;
