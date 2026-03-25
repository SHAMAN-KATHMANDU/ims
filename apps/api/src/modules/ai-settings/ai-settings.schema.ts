import { z } from "zod";

export const UpdateAiSettingsSchema = z.object({
  systemPrompt: z
    .string()
    .max(4000, "System prompt must be 4000 characters or fewer")
    .optional()
    .nullable(),
});

export type UpdateAiSettingsDto = z.infer<typeof UpdateAiSettingsSchema>;
