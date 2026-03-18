import { z } from "zod";

export const ConnectChannelSchema = z.object({
  provider: z.literal("FACEBOOK_MESSENGER"),
  authCode: z.string().min(1, "Auth code is required"),
  redirectUri: z.string().url("Valid redirect URI is required"),
});

export const UpdateChannelSchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

export type ConnectChannelDto = z.infer<typeof ConnectChannelSchema>;
export type UpdateChannelDto = z.infer<typeof UpdateChannelSchema>;
