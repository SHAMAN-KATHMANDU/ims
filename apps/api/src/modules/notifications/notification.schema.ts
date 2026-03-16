import { z } from "zod";

const NOTIFICATION_TYPES = [
  "TASK_DUE",
  "DEAL_STAGE_CHANGE",
  "LEAD_ASSIGNMENT",
] as const;

export const NotificationListQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => Math.max(1, parseInt(v || "1") || 1)),
  limit: z
    .string()
    .optional()
    .transform((v) => Math.min(100, Math.max(1, parseInt(v || "20") || 20))),
  unreadOnly: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  type: z.enum(NOTIFICATION_TYPES).optional(),
});

export type NotificationListQuery = z.infer<typeof NotificationListQuerySchema>;
