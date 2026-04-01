import { z } from "zod";
import { WORKFLOW_TRIGGER_VALUES, WORKFLOW_ACTION_VALUES } from "@repo/shared";

export const WORKFLOW_TRIGGERS = WORKFLOW_TRIGGER_VALUES;
export const WORKFLOW_ACTIONS = WORKFLOW_ACTION_VALUES;

export const WorkflowTriggerSchema = z.enum(WORKFLOW_TRIGGER_VALUES);
export const WorkflowActionSchema = z.enum(WORKFLOW_ACTION_VALUES);

export const TaskDealLinkSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("CURRENT_DEAL") }),
  z.object({
    mode: z.literal("OPEN_DEAL_IN_PIPELINE"),
    targetPipelineId: z.string().uuid().optional(),
    targetPipelineType: z
      .enum(["NEW_SALES", "REMARKETING", "REPURCHASE"])
      .optional(),
    stageName: z.string().max(100).optional(),
  }),
]);
export type TaskDealLink = z.infer<typeof TaskDealLinkSchema>;

// Per-action config schemas for validation and security
export const CreateTaskConfigSchema = z.object({
  taskTitle: z.string().max(500).optional(),
  dueDateDays: z.number().int().min(0).max(365).optional(),
  assigneeId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  taskDealLink: TaskDealLinkSchema.optional(),
});
export type CreateTaskConfig = z.infer<typeof CreateTaskConfigSchema>;

export const SendNotificationConfigSchema = z.object({
  title: z.string().max(255).optional(),
  message: z.string().max(2000).optional(),
  userId: z.string().uuid().optional(),
});
export type SendNotificationConfig = z.infer<
  typeof SendNotificationConfigSchema
>;

export const MoveStageConfigSchema = z.object({
  targetStageId: z.string().min(1, "targetStageId is required").max(100),
  /** When set, moves the deal to this pipeline and stage; when omitted, only stage changes within the current pipeline. */
  targetPipelineId: z.string().uuid().optional(),
});
export type MoveStageConfig = z.infer<typeof MoveStageConfigSchema>;

export const UPDATE_FIELD_ALLOWED = ["expectedCloseDate"] as const;
export const UpdateFieldConfigSchema = z.object({
  field: z.enum(UPDATE_FIELD_ALLOWED),
  value: z.union([z.number(), z.string(), z.null()]),
});
export type UpdateFieldConfig = z.infer<typeof UpdateFieldConfigSchema>;

export const CreateActivityConfigSchema = z.object({
  type: z.enum(["CALL", "EMAIL", "MEETING"]).optional(),
  subject: z.string().max(500).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});
export type CreateActivityConfig = z.infer<typeof CreateActivityConfigSchema>;

export const CreateDealConfigSchema = z
  .object({
    pipelineId: z.string().uuid().optional(),
    pipelineType: z.enum(["NEW_SALES", "REMARKETING", "REPURCHASE"]).optional(),
    stageId: z.string().max(100).optional(),
    stageName: z.string().max(100).optional(),
    title: z.string().max(500).optional(),
  })
  .refine((value) => value.pipelineId || value.pipelineType, {
    message: "pipelineId or pipelineType is required",
  });
export type CreateDealConfig = z.infer<typeof CreateDealConfigSchema>;

/** Only safe CRM fields — do not allow arbitrary Prisma keys. */
export const UPDATE_CONTACT_FIELD_ALLOWED = ["source"] as const;
export const UpdateContactFieldConfigSchema = z.object({
  field: z.enum(UPDATE_CONTACT_FIELD_ALLOWED),
  value: z.union([z.string(), z.null()]),
});
export type UpdateContactFieldConfig = z.infer<
  typeof UpdateContactFieldConfigSchema
>;

export const ApplyTagConfigSchema = z.object({
  tag: z.string().min(1, "tag is required").max(100),
});
export type ApplyTagConfig = z.infer<typeof ApplyTagConfigSchema>;

export const RemoveTagConfigSchema = z.object({
  tag: z.string().min(1, "tag is required").max(100),
});
export type RemoveTagConfig = z.infer<typeof RemoveTagConfigSchema>;

const ActionConfigByAction = {
  CREATE_TASK: CreateTaskConfigSchema,
  SEND_NOTIFICATION: SendNotificationConfigSchema,
  MOVE_STAGE: MoveStageConfigSchema,
  UPDATE_FIELD: UpdateFieldConfigSchema,
  CREATE_ACTIVITY: CreateActivityConfigSchema,
  CREATE_DEAL: CreateDealConfigSchema,
  UPDATE_CONTACT_FIELD: UpdateContactFieldConfigSchema,
  APPLY_TAG: ApplyTagConfigSchema,
  REMOVE_TAG: RemoveTagConfigSchema,
} as const;

/** Validates actionConfig against the schema for the given action. Returns parsed config or throws ZodError. */
export function parseActionConfig(
  action: z.infer<typeof WorkflowActionSchema>,
  config: unknown,
): z.infer<(typeof ActionConfigByAction)[typeof action]> {
  const schema = ActionConfigByAction[action];
  return schema.parse(config ?? {}) as z.infer<
    (typeof ActionConfigByAction)[typeof action]
  >;
}

/** Legacy: loose record for backward compatibility where full validation is not required. Prefer parseActionConfig in the engine. */
export const ActionConfigSchema = z.record(z.unknown());

export const CreateWorkflowRuleSchema = z.object({
  trigger: WorkflowTriggerSchema,
  triggerStageId: z.string().max(100).optional().nullable(),
  action: WorkflowActionSchema,
  actionConfig: ActionConfigSchema,
  ruleOrder: z.number().int().min(0).optional(),
});

export const UpdateWorkflowRuleSchema = CreateWorkflowRuleSchema.partial();

export const CreateWorkflowSchema = z.object({
  pipelineId: z.string().uuid(),
  name: z.string().min(1, "Name is required").max(255),
  isActive: z.boolean().optional(),
  rules: z.array(CreateWorkflowRuleSchema).optional(),
});

export const UpdateWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  isActive: z.boolean().optional(),
  rules: z.array(CreateWorkflowRuleSchema).optional(),
});

/** Query params for GET /workflows */
export const GetWorkflowsQuerySchema = z.object({
  pipelineId: z.string().uuid().optional(),
  page: z
    .string()
    .optional()
    .transform((v) => Math.max(1, parseInt(v || "1") || 1)),
  limit: z
    .string()
    .optional()
    .transform((v) => Math.min(100, Math.max(1, parseInt(v || "10") || 10))),
  search: z
    .string()
    .optional()
    .transform((s) => (s?.trim() ? s.trim() : undefined)),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) =>
      v === "true" ? true : v === "false" ? false : undefined,
    ),
});

/** Route param for workflow id (getById, update, delete) */
export const WorkflowIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateWorkflowDto = z.infer<typeof CreateWorkflowSchema>;
export type UpdateWorkflowDto = z.infer<typeof UpdateWorkflowSchema>;
export type CreateWorkflowRuleDto = z.infer<typeof CreateWorkflowRuleSchema>;
export type GetWorkflowsQueryDto = z.infer<typeof GetWorkflowsQuerySchema>;
export type WorkflowIdParamDto = z.infer<typeof WorkflowIdParamSchema>;
