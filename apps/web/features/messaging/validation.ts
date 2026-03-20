import { z } from "zod";

/** Step 1 — must be saved before Meta webhook verification can succeed. */
export const ManualWebhookVerifyFormSchema = z.object({
  webhookVerifyToken: z
    .string()
    .min(1, "Verify token is required")
    .max(255, "Verify token must be at most 255 characters"),
});

/** Step 2 — after Meta “Verify and save” on the webhook. */
export const ManualCompleteFormSchema = z.object({
  pageId: z.string().min(1, "Page ID is required"),
  pageName: z.string().min(1, "Page name is required"),
  pageAccessToken: z.string().min(1, "Page access token is required"),
});

export type ManualWebhookVerifyFormValues = z.infer<
  typeof ManualWebhookVerifyFormSchema
>;
export type ManualCompleteFormValues = z.infer<typeof ManualCompleteFormSchema>;
