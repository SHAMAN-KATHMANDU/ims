import { z } from "zod";

export const CreateCrmSourceSchema = z.object({
  name: z.string().min(1, "Source name is required").max(100),
});

export const UpdateCrmSourceSchema = z.object({
  name: z.string().min(1, "Source name is required").max(100),
});

export const CreateCrmJourneyTypeSchema = z.object({
  name: z.string().min(1, "Journey type name is required").max(100),
});

export const UpdateCrmJourneyTypeSchema = z.object({
  name: z.string().min(1, "Journey type name is required").max(100),
});

export type CreateCrmSourceDto = z.infer<typeof CreateCrmSourceSchema>;
export type UpdateCrmSourceDto = z.infer<typeof UpdateCrmSourceSchema>;
export type CreateCrmJourneyTypeDto = z.infer<
  typeof CreateCrmJourneyTypeSchema
>;
export type UpdateCrmJourneyTypeDto = z.infer<
  typeof UpdateCrmJourneyTypeSchema
>;
