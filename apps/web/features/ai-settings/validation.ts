import { z } from "zod";

export const AiSettingsSchema = z.object({
  systemPrompt: z
    .string()
    .max(4000, "System prompt must be 4000 characters or fewer"),
});

export type AiSettingsInput = z.infer<typeof AiSettingsSchema>;
