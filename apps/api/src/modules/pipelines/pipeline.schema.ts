import { z } from "zod";

const StageSchema = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number(),
  probability: z.number().optional().default(0),
});

export const CreatePipelineSchema = z.object({
  name: z.string().min(1, "Pipeline name is required").max(255).trim(),
  stages: z.array(StageSchema).optional(),
  isDefault: z.boolean().optional(),
});

export const UpdatePipelineSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  stages: z.array(StageSchema).optional(),
  isDefault: z.boolean().optional(),
});

export type CreatePipelineDto = z.infer<typeof CreatePipelineSchema>;
export type UpdatePipelineDto = z.infer<typeof UpdatePipelineSchema>;
