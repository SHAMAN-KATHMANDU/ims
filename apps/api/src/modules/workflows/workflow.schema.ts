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

export type CreateWorkflowDto = z.infer<typeof CreateWorkflowSchema>;
export type UpdateWorkflowDto = z.infer<typeof UpdateWorkflowSchema>;
export type CreateWorkflowRuleDto = z.infer<typeof CreateWorkflowRuleSchema>;
