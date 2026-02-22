import { z } from "zod";

const queryBooleanSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    if (value === "true" || value === "1") return true;
    if (value === "false" || value === "0") return false;
  }
  return value;
}, z.boolean());

export const notificationsListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  unreadOnly: queryBooleanSchema.optional(),
});

export const notificationIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Notification ID is required"),
});
