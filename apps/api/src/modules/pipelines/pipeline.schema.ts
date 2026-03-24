import { z } from "zod";

const StageSchema = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number(),
  probability: z.number().optional().default(0),
});

const PipelineTypeSchema = z.enum([
  "GENERAL",
  "NEW_SALES",
  "REMARKETING",
  "REPURCHASE",
]);

export const CreatePipelineSchema = z.object({
  name: z.string().min(1, "Pipeline name is required").max(255).trim(),
  type: PipelineTypeSchema.optional(),
  stages: z.array(StageSchema).optional(),
  isDefault: z.boolean().optional(),
  closedWonStageName: z.string().max(100).optional().nullable(),
  closedLostStageName: z.string().max(100).optional().nullable(),
});

export const UpdatePipelineSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  stages: z.array(StageSchema).optional(),
  isDefault: z.boolean().optional(),
  closedWonStageName: z.string().max(100).optional().nullable(),
  closedLostStageName: z.string().max(100).optional().nullable(),
});

/** Query params for GET /pipelines. When both page and limit are absent, API returns all (no pagination). */
export const ListPipelinesQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) =>
      v === undefined || v === "" ? undefined : Math.max(1, parseInt(v) || 1),
    ),
  limit: z
    .string()
    .optional()
    .transform((v) =>
      v === undefined || v === ""
        ? undefined
        : Math.min(100, Math.max(1, parseInt(v) || 10)),
    ),
  search: z
    .string()
    .optional()
    .transform((s) => (s?.trim() ? s.trim() : undefined)),
});

export type CreatePipelineDto = z.infer<typeof CreatePipelineSchema>;
export type UpdatePipelineDto = z.infer<typeof UpdatePipelineSchema>;
export type ListPipelinesQueryDto = z.infer<typeof ListPipelinesQuerySchema>;
