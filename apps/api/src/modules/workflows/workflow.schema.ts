import { z } from "zod";

export const WORKFLOW_TRIGGERS = [
  "STAGE_ENTER",
  "STAGE_EXIT",
  "DEAL_CREATED",
  "DEAL_WON",
  "DEAL_LOST",
] as const;
export const WORKFLOW_ACTIONS = [
  "CREATE_TASK",
  "SEND_NOTIFICATION",
  "MOVE_STAGE",
  "UPDATE_FIELD",
  "CREATE_ACTIVITY",
] as const;

export const WorkflowTriggerSchema = z.enum(WORKFLOW_TRIGGERS);
export const WorkflowActionSchema = z.enum(WORKFLOW_ACTIONS);

// Per-action config schemas for validation and security
export const CreateTaskConfigSchema = z.object({
  taskTitle: z.string().max(500).optional(),
  dueDateDays: z.number().int().min(0).max(365).optional(),
  assigneeId: z.string().uuid().optional(),
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
});
export type MoveStageConfig = z.infer<typeof MoveStageConfigSchema>;

export const UPDATE_FIELD_ALLOWED = [
  "probability",
  "expectedCloseDate",
] as const;
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

const ActionConfigByAction = {
  CREATE_TASK: CreateTaskConfigSchema,
  SEND_NOTIFICATION: SendNotificationConfigSchema,
  MOVE_STAGE: MoveStageConfigSchema,
  UPDATE_FIELD: UpdateFieldConfigSchema,
  CREATE_ACTIVITY: CreateActivityConfigSchema,
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
