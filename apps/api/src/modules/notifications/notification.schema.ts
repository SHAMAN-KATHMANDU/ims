import { z } from "zod";

export const NotificationListQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => Math.min(100, Math.max(1, parseInt(v || "20") || 20))),
  unreadOnly: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

export type NotificationListQuery = z.infer<typeof NotificationListQuerySchema>;
