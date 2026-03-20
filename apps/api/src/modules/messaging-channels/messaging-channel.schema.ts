import { z } from "zod";

export const ConnectChannelSchema = z.object({
  provider: z.literal("FACEBOOK_MESSENGER"),
  authCode: z.string().min(1, "Auth code is required"),
  redirectUri: z.string().url("Valid redirect URI is required"),
});

export const UpdateChannelSchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

/** Step 1 — persist verify token so Meta GET webhook verification can succeed. */
export const RegisterManualWebhookVerifySchema = z.object({
  provider: z.literal("FACEBOOK_MESSENGER"),
  webhookVerifyToken: z
    .string()
    .min(1, "Verify token is required")
    .max(255, "Verify token must be at most 255 characters"),
});

/** Step 2 — after webhook is verified in Meta, supply page credentials and subscribe. */
export const CompleteManualConnectSchema = z.object({
  pageId: z.string().min(1, "Page ID is required"),
  pageAccessToken: z.string().min(1, "Page access token is required"),
  pageName: z.string().min(1, "Page name is required").max(255),
});

export type ConnectChannelDto = z.infer<typeof ConnectChannelSchema>;
export type UpdateChannelDto = z.infer<typeof UpdateChannelSchema>;
export type RegisterManualWebhookVerifyDto = z.infer<
  typeof RegisterManualWebhookVerifySchema
>;
export type CompleteManualConnectDto = z.infer<
  typeof CompleteManualConnectSchema
>;
