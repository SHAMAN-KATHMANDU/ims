import { z } from "zod";
import type {
  WorkflowActionValue,
  WorkflowTriggerValue,
} from "./workflow-enums";
import {
  WORKFLOW_ACTION_VALUES,
  WORKFLOW_TRIGGER_VALUES,
} from "./workflow-enums";

export const WORKFLOW_PIPELINE_TYPES = [
  "NEW_SALES",
  "REMARKETING",
  "REPURCHASE",
] as const;

export type WorkflowPipelineType = (typeof WORKFLOW_PIPELINE_TYPES)[number];

export const WORKFLOW_TEMPLATE_CATEGORIES = [
  "DEFAULT",
  "DEAL_HYGIENE",
  "RE_ENGAGEMENT",
  "POST_SALE",
  "DATA_QUALITY",
  "INTERNAL_ALERTS",
] as const;

export type WorkflowTemplateCategory =
  (typeof WORKFLOW_TEMPLATE_CATEGORIES)[number];

export const WORKFLOW_TEMPLATE_DIFFICULTIES = [
  "BEGINNER",
  "INTERMEDIATE",
] as const;

export type WorkflowTemplateDifficulty =
  (typeof WORKFLOW_TEMPLATE_DIFFICULTIES)[number];

export const WORKFLOW_TEMPLATE_SUPPORTED_OBJECTS = [
  "DEAL",
  "CONTACT",
  "TASK",
  "NOTIFICATION",
] as const;

export type WorkflowTemplateSupportedObject =
  (typeof WORKFLOW_TEMPLATE_SUPPORTED_OBJECTS)[number];

export const WorkflowTriggerValueSchema = z.enum(WORKFLOW_TRIGGER_VALUES);
export const WorkflowActionValueSchema = z.enum(WORKFLOW_ACTION_VALUES);
export const WorkflowPipelineTypeSchema = z.enum(WORKFLOW_PIPELINE_TYPES);
export const WorkflowTemplateCategorySchema = z.enum(
  WORKFLOW_TEMPLATE_CATEGORIES,
);
export const WorkflowTemplateDifficultySchema = z.enum(
  WORKFLOW_TEMPLATE_DIFFICULTIES,
);
export const WorkflowTemplateSupportedObjectSchema = z.enum(
  WORKFLOW_TEMPLATE_SUPPORTED_OBJECTS,
);

export const TaskDealLinkSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("CURRENT_DEAL") }),
  z.object({
    mode: z.literal("OPEN_DEAL_IN_PIPELINE"),
    targetPipelineId: z.string().uuid().optional(),
    targetPipelineType: WorkflowPipelineTypeSchema.optional(),
    stageName: z.string().max(100).optional(),
  }),
]);
export type TaskDealLink = z.infer<typeof TaskDealLinkSchema>;

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
    pipelineType: WorkflowPipelineTypeSchema.optional(),
    stageId: z.string().max(100).optional(),
    stageName: z.string().max(100).optional(),
    title: z.string().max(500).optional(),
  })
  .refine((value) => value.pipelineId || value.pipelineType, {
    message: "pipelineId or pipelineType is required",
  });
export type CreateDealConfig = z.infer<typeof CreateDealConfigSchema>;

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

export const WorkflowActionConfigSchemaByAction = {
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

export type WorkflowActionConfigByAction = {
  [K in keyof typeof WorkflowActionConfigSchemaByAction]: z.infer<
    (typeof WorkflowActionConfigSchemaByAction)[K]
  >;
};

export type WorkflowActionConfigValue =
  WorkflowActionConfigByAction[keyof WorkflowActionConfigByAction];

export function parseWorkflowActionConfig<TAction extends WorkflowActionValue>(
  action: TAction,
  config: unknown,
): WorkflowActionConfigByAction[TAction] {
  const schema = WorkflowActionConfigSchemaByAction[action];
  return schema.parse(config ?? {}) as WorkflowActionConfigByAction[TAction];
}

export interface CrmWorkflowTemplateRule {
  trigger: WorkflowTriggerValue;
  triggerStageId?: string | null;
  action: WorkflowActionValue;
  actionConfig: WorkflowActionConfigValue;
  ruleOrder?: number;
}

export interface CrmWorkflowTemplate {
  templateKey: string;
  pipelineType: WorkflowPipelineType;
  name: string;
  description: string;
  category: WorkflowTemplateCategory;
  difficulty: WorkflowTemplateDifficulty;
  recommended: boolean;
  supportedObjects: readonly WorkflowTemplateSupportedObject[];
  version: number;
  isActive?: boolean;
  rules: CrmWorkflowTemplateRule[];
}

const WorkflowTemplateRuleBaseSchema = z.object({
  trigger: WorkflowTriggerValueSchema,
  triggerStageId: z.string().max(100).optional().nullable(),
  action: WorkflowActionValueSchema,
  actionConfig: z.unknown(),
  ruleOrder: z.number().int().min(0).optional(),
});

export const CrmWorkflowTemplateSchema = z
  .object({
    templateKey: z
      .string()
      .min(3)
      .max(120)
      .regex(/^[a-z0-9-]+$/, "templateKey must be kebab-case"),
    pipelineType: WorkflowPipelineTypeSchema,
    name: z.string().min(1).max(255),
    description: z.string().min(1).max(1000),
    category: WorkflowTemplateCategorySchema,
    difficulty: WorkflowTemplateDifficultySchema,
    recommended: z.boolean(),
    supportedObjects: z
      .array(WorkflowTemplateSupportedObjectSchema)
      .min(1)
      .superRefine((value, ctx) => {
        const duplicates = value.filter(
          (item, index) => value.indexOf(item) !== index,
        );
        if (duplicates.length > 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `supportedObjects must be unique: ${duplicates.join(", ")}`,
          });
        }
      }),
    version: z.number().int().min(1),
    isActive: z.boolean().optional(),
    rules: z.array(WorkflowTemplateRuleBaseSchema).min(1),
  })
  .transform((template): CrmWorkflowTemplate => {
    const parsedRules = template.rules.map((rule) => ({
      trigger: rule.trigger,
      triggerStageId: rule.triggerStageId ?? null,
      action: rule.action,
      actionConfig: parseWorkflowActionConfig(rule.action, rule.actionConfig),
      ruleOrder: rule.ruleOrder,
    }));
    return {
      ...template,
      supportedObjects: [...template.supportedObjects],
      rules: parsedRules,
    };
  })
  .superRefine((template, ctx) => {
    const stageTriggeredRules = template.rules.filter(
      (rule) =>
        (rule.trigger === "STAGE_ENTER" || rule.trigger === "STAGE_EXIT") &&
        !rule.triggerStageId,
    );
    if (stageTriggeredRules.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Stage enter/exit rules must define triggerStageId",
      });
    }

    const duplicateRuleOrders = template.rules
      .map((rule, index) => rule.ruleOrder ?? index)
      .filter(
        (ruleOrder, index, values) => values.indexOf(ruleOrder) !== index,
      );
    if (duplicateRuleOrders.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Rule order values must be unique per template: ${duplicateRuleOrders.join(", ")}`,
      });
    }
  });

function parseCrmWorkflowTemplates(
  templates: readonly CrmWorkflowTemplate[],
): readonly CrmWorkflowTemplate[] {
  const parsed = z.array(CrmWorkflowTemplateSchema).parse(templates);
  const duplicateKeys = parsed
    .map((template) => template.templateKey)
    .filter(
      (templateKey, index, values) => values.indexOf(templateKey) !== index,
    );

  if (duplicateKeys.length > 0) {
    throw new Error(
      `Duplicate CRM workflow template keys: ${duplicateKeys.join(", ")}`,
    );
  }

  return parsed;
}

const RAW_CRM_WORKFLOW_TEMPLATES = [
  {
    templateKey: "new-sales-sales-won-follow-up",
    pipelineType: "NEW_SALES",
    name: "Sales won follow-up",
    description:
      "When a new-sales deal is won, create the next remarketing deal and a follow-up task so the customer is not dropped after the sale.",
    category: "DEFAULT",
    difficulty: "BEGINNER",
    recommended: true,
    supportedObjects: ["DEAL", "TASK"],
    version: 1,
    isActive: true,
    rules: [
      {
        trigger: "DEAL_WON",
        action: "CREATE_DEAL",
        actionConfig: {
          pipelineType: "REMARKETING",
          stageName: "Follow-up Due",
          title: "Remarketing follow-up",
        },
        ruleOrder: 0,
      },
      {
        trigger: "DEAL_WON",
        action: "CREATE_TASK",
        actionConfig: {
          taskTitle: "Follow up after sale",
          dueDateDays: 3,
          taskDealLink: {
            mode: "OPEN_DEAL_IN_PIPELINE",
            targetPipelineType: "REMARKETING",
          },
        },
        ruleOrder: 1,
      },
    ],
  },
  {
    templateKey: "new-sales-stalled-nurture",
    pipelineType: "NEW_SALES",
    name: "Sales stalled nurture",
    description:
      "Create follow-up tasks when deals reach proposal and negotiation stages so reps keep momentum on active opportunities.",
    category: "DEAL_HYGIENE",
    difficulty: "BEGINNER",
    recommended: true,
    supportedObjects: ["TASK"],
    version: 1,
    isActive: true,
    rules: [
      {
        trigger: "STAGE_ENTER",
        triggerStageId: "Proposal Sent",
        action: "CREATE_TASK",
        actionConfig: {
          taskTitle: "Check proposal feedback",
          dueDateDays: 2,
        },
        ruleOrder: 0,
      },
      {
        trigger: "STAGE_ENTER",
        triggerStageId: "Negotiating",
        action: "CREATE_TASK",
        actionConfig: {
          taskTitle: "Advance negotiation",
          dueDateDays: 1,
        },
        ruleOrder: 1,
      },
    ],
  },
  {
    templateKey: "remarketing-re-engagement",
    pipelineType: "REMARKETING",
    name: "Remarketing re-engagement",
    description:
      "Drive repeat outreach by creating tasks when repeat-purchase signals increase or a contact re-enters active remarketing stages.",
    category: "RE_ENGAGEMENT",
    difficulty: "BEGINNER",
    recommended: true,
    supportedObjects: ["TASK"],
    version: 1,
    isActive: true,
    rules: [
      {
        trigger: "PURCHASE_COUNT_CHANGED",
        action: "CREATE_TASK",
        actionConfig: {
          taskTitle: "Follow up with repeat customer",
          dueDateDays: 3,
        },
        ruleOrder: 0,
      },
      {
        trigger: "STAGE_ENTER",
        triggerStageId: "Re-engaged",
        action: "CREATE_TASK",
        actionConfig: {
          taskTitle: "Send offer to re-engaged contact",
          dueDateDays: 1,
        },
        ruleOrder: 1,
      },
      {
        trigger: "STAGE_ENTER",
        triggerStageId: "Offer Sent",
        action: "CREATE_TASK",
        actionConfig: {
          taskTitle: "Check offer response",
          dueDateDays: 2,
        },
        ruleOrder: 2,
      },
    ],
  },
  {
    templateKey: "repurchase-progression",
    pipelineType: "REPURCHASE",
    name: "Repurchasing progression",
    description:
      "Keep repeat-purchase opportunities moving with tasks at the review and offer stages.",
    category: "DEFAULT",
    difficulty: "BEGINNER",
    recommended: true,
    supportedObjects: ["TASK"],
    version: 1,
    isActive: true,
    rules: [
      {
        trigger: "STAGE_ENTER",
        triggerStageId: "Existing Customer",
        action: "CREATE_TASK",
        actionConfig: {
          taskTitle: "Review repeat-purchase needs",
          dueDateDays: 2,
        },
        ruleOrder: 0,
      },
      {
        trigger: "STAGE_ENTER",
        triggerStageId: "Offer Sent",
        action: "CREATE_TASK",
        actionConfig: {
          taskTitle: "Follow up on repeat-purchase offer",
          dueDateDays: 2,
        },
        ruleOrder: 1,
      },
    ],
  },
  {
    templateKey: "new-sales-proposal-alert",
    pipelineType: "NEW_SALES",
    name: "Proposal alert for owners",
    description:
      "Notify the deal owner and create a task when a deal enters Proposal Sent so proposals never sit without action.",
    category: "INTERNAL_ALERTS",
    difficulty: "BEGINNER",
    recommended: true,
    supportedObjects: ["TASK", "NOTIFICATION"],
    version: 1,
    isActive: true,
    rules: [
      {
        trigger: "STAGE_ENTER",
        triggerStageId: "Proposal Sent",
        action: "SEND_NOTIFICATION",
        actionConfig: {
          title: "Proposal sent",
          message: "Review the proposal and schedule a follow-up touchpoint.",
        },
        ruleOrder: 0,
      },
      {
        trigger: "STAGE_ENTER",
        triggerStageId: "Proposal Sent",
        action: "CREATE_TASK",
        actionConfig: {
          taskTitle: "Review proposal status",
          dueDateDays: 2,
        },
        ruleOrder: 1,
      },
    ],
  },
  {
    templateKey: "new-sales-negotiation-escalation",
    pipelineType: "NEW_SALES",
    name: "Negotiation escalation",
    description:
      "Create an internal activity record and owner reminder when a deal enters negotiation to keep leadership visibility on late-stage deals.",
    category: "INTERNAL_ALERTS",
    difficulty: "INTERMEDIATE",
    recommended: false,
    supportedObjects: ["TASK", "NOTIFICATION"],
    version: 1,
    isActive: true,
    rules: [
      {
        trigger: "STAGE_ENTER",
        triggerStageId: "Negotiating",
        action: "SEND_NOTIFICATION",
        actionConfig: {
          title: "Deal entered negotiation",
          message:
            "High-value deal entered negotiation. Confirm next step and expected close timing.",
        },
        ruleOrder: 0,
      },
      {
        trigger: "STAGE_ENTER",
        triggerStageId: "Negotiating",
        action: "CREATE_TASK",
        actionConfig: {
          taskTitle: "Confirm negotiation next step",
          dueDateDays: 1,
        },
        ruleOrder: 1,
      },
    ],
  },
  {
    templateKey: "remarketing-source-normalizer",
    pipelineType: "REMARKETING",
    name: "Mark contact as remarketing",
    description:
      "Normalize the contact source and tag when a deal enters the remarketing pipeline so segmentation stays consistent.",
    category: "DATA_QUALITY",
    difficulty: "BEGINNER",
    recommended: false,
    supportedObjects: ["CONTACT"],
    version: 1,
    isActive: true,
    rules: [
      {
        trigger: "STAGE_ENTER",
        triggerStageId: "Follow-up Due",
        action: "UPDATE_CONTACT_FIELD",
        actionConfig: {
          field: "source",
          value: "Remarketing",
        },
        ruleOrder: 0,
      },
      {
        trigger: "STAGE_ENTER",
        triggerStageId: "Follow-up Due",
        action: "APPLY_TAG",
        actionConfig: {
          tag: "Re-engage",
        },
        ruleOrder: 1,
      },
    ],
  },
  {
    templateKey: "repurchase-vip-recheck",
    pipelineType: "REPURCHASE",
    name: "VIP repurchase re-check",
    description:
      "Flag and follow up on repeat customers as they enter the repurchase motion.",
    category: "POST_SALE",
    difficulty: "BEGINNER",
    recommended: false,
    supportedObjects: ["CONTACT", "TASK"],
    version: 1,
    isActive: true,
    rules: [
      {
        trigger: "STAGE_ENTER",
        triggerStageId: "Existing Customer",
        action: "APPLY_TAG",
        actionConfig: {
          tag: "Repeat Buyer",
        },
        ruleOrder: 0,
      },
      {
        trigger: "STAGE_ENTER",
        triggerStageId: "Existing Customer",
        action: "CREATE_TASK",
        actionConfig: {
          taskTitle: "Review VIP repurchase opportunity",
          dueDateDays: 2,
        },
        ruleOrder: 1,
      },
    ],
  },
] as const satisfies readonly CrmWorkflowTemplate[];

export const CRM_WORKFLOW_TEMPLATES = parseCrmWorkflowTemplates(
  RAW_CRM_WORKFLOW_TEMPLATES,
);

export function getCrmWorkflowTemplateByKey(
  templateKey: string,
): CrmWorkflowTemplate | undefined {
  return CRM_WORKFLOW_TEMPLATES.find(
    (template) => template.templateKey === templateKey,
  );
}
