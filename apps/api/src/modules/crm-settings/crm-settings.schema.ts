import { z } from "zod";

export const CreateCrmSourceSchema = z.object({
  name: z.string().min(1, "Source name is required").max(100),
});

export const UpdateCrmSourceSchema = z.object({
  name: z.string().min(1, "Source name is required").max(100),
});

export type CreateCrmSourceDto = z.infer<typeof CreateCrmSourceSchema>;
export type UpdateCrmSourceDto = z.infer<typeof UpdateCrmSourceSchema>;
