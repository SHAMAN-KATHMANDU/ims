import { z } from "zod";

const stageSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  order: z.coerce.number().int().nonnegative(),
  probability: z.coerce.number().min(0).max(100),
});

export const createPipelineSchema = z.object({
  name: z.string().trim().min(1, "Pipeline name is required"),
  stages: z.array(stageSchema).optional(),
  isDefault: z.boolean().optional(),
});

export const updatePipelineSchema = z.object({
  name: z.string().trim().min(1).optional(),
  stages: z.array(stageSchema).optional(),
  isDefault: z.boolean().optional(),
});

export const pipelineIdParamsSchema = z.object({
  id: z.string().uuid("Invalid pipeline id"),
});
