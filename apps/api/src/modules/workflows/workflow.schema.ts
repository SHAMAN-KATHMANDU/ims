import { z } from "zod";
// Imports used inside this file (action-config map + parsers).
import {
  CRM_WORKFLOW_TEMPLATES,
  WORKFLOW_TRIGGER_VALUES,
  WORKFLOW_ACTION_VALUES,
  CreateTaskConfigSchema,
  SendNotificationConfigSchema,
  MoveStageConfigSchema,
  UpdateFieldConfigSchema,
  CreateActivityConfigSchema,
  CreateDealConfigSchema,
  UpdateContactFieldConfigSchema,
  ApplyTagConfigSchema,
  RemoveTagConfigSchema,
  parseWorkflowActionConfig,
} from "@repo/shared";

// Direct re-exports — never bound locally to avoid eslint no-unused-vars
// false-positives on items only consumed by downstream importers.
export {
  TaskDealLinkSchema,
  CreateTaskConfigSchema,
  SendNotificationConfigSchema,
  MoveStageConfigSchema,
  UPDATE_FIELD_ALLOWED,
  UpdateFieldConfigSchema,
  CreateActivityConfigSchema,
  CreateDealConfigSchema,
  UPDATE_CONTACT_FIELD_ALLOWED,
  UpdateContactFieldConfigSchema,
  ApplyTagConfigSchema,
  RemoveTagConfigSchema,
} from "@repo/shared";
export type {
  TaskDealLink,
  CreateTaskConfig,
  SendNotificationConfig,
  MoveStageConfig,
  UpdateFieldConfig,
  CreateActivityConfig,
  CreateDealConfig,
  UpdateContactFieldConfig,
  ApplyTagConfig,
  RemoveTagConfig,
} from "@repo/shared";

export const WORKFLOW_TRIGGERS = WORKFLOW_TRIGGER_VALUES;
export const WORKFLOW_ACTIONS = WORKFLOW_ACTION_VALUES;

export const WorkflowTriggerSchema = z.enum(WORKFLOW_TRIGGER_VALUES);
export const WorkflowActionSchema = z.enum(WORKFLOW_ACTION_VALUES);

// Value is referenced only via `typeof ActionConfigByAction` below — the rule
// misreads type-only usage as the binding being unused.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  return parseWorkflowActionConfig(action, config) as z.infer<
    (typeof ActionConfigByAction)[typeof action]
  >;
}

/** Legacy: loose record for backward compatibility where full validation is not required. Prefer parseActionConfig in the engine. */
export const ActionConfigSchema = z.record(z.unknown());

const CreateWorkflowRuleBaseSchema = z.object({
  trigger: WorkflowTriggerSchema,
  triggerStageId: z.string().max(100).optional().nullable(),
  action: WorkflowActionSchema,
  actionConfig: ActionConfigSchema,
  ruleOrder: z.number().int().min(0).optional(),
});

export const CreateWorkflowRuleSchema =
  CreateWorkflowRuleBaseSchema.superRefine((value, ctx) => {
    // Engine: null triggerStageId = match any stage. Undefined/empty = not chosen (invalid).
    if (
      (value.trigger === "STAGE_ENTER" || value.trigger === "STAGE_EXIT") &&
      (value.triggerStageId === undefined || value.triggerStageId === "")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["triggerStageId"],
        message: "Choose a specific stage or Any stage for this trigger",
      });
    }

    try {
      parseActionConfig(value.action, value.actionConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        for (const issue of error.issues) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["actionConfig", ...issue.path],
            message: issue.message,
          });
        }
        return;
      }

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["actionConfig"],
        message:
          error instanceof Error
            ? error.message
            : "Invalid workflow action config",
      });
    }
  });

export const UpdateWorkflowRuleSchema = CreateWorkflowRuleBaseSchema.partial();

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

const WORKFLOW_TEMPLATE_KEYS = CRM_WORKFLOW_TEMPLATES.map(
  (template) => template.templateKey,
) as [string, ...string[]];

export const WorkflowTemplateKeyParamSchema = z.object({
  templateKey: z.enum(WORKFLOW_TEMPLATE_KEYS, {
    errorMap: () => ({ message: "Unknown workflow template" }),
  }),
});

export const InstallWorkflowTemplateSchema = z.object({
  pipelineId: z.string().uuid().optional(),
  overwriteExisting: z.boolean().optional().default(false),
  activate: z.boolean().optional().default(true),
});

export const GetWorkflowRunsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => Math.min(100, Math.max(1, parseInt(v || "20") || 20))),
});

export type CreateWorkflowDto = z.infer<typeof CreateWorkflowSchema>;
export type UpdateWorkflowDto = z.infer<typeof UpdateWorkflowSchema>;
export type CreateWorkflowRuleDto = z.infer<typeof CreateWorkflowRuleSchema>;
export type GetWorkflowsQueryDto = z.infer<typeof GetWorkflowsQuerySchema>;
export type WorkflowIdParamDto = z.infer<typeof WorkflowIdParamSchema>;
export type WorkflowTemplateKeyParamDto = z.infer<
  typeof WorkflowTemplateKeyParamSchema
>;
export type InstallWorkflowTemplateDto = z.infer<
  typeof InstallWorkflowTemplateSchema
>;
export type GetWorkflowRunsQueryDto = z.infer<
  typeof GetWorkflowRunsQuerySchema
>;
