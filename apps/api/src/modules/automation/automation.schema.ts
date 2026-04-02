import { z } from "zod";
import {
  AutomationActionTypeSchema,
  AutomationConditionSchema,
  AutomationExecutionModeSchema,
  AutomationScopeSchema,
  AutomationStatusSchema,
  AutomationTriggerEventSchema,
  isAutomationActionAllowedForEvent,
  parseAutomationActionConfig,
} from "@repo/shared";

export const AutomationIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const CreateAutomationTriggerSchema = z.object({
  eventName: AutomationTriggerEventSchema,
  conditions: z.array(AutomationConditionSchema).optional(),
  delayMinutes: z
    .number()
    .int()
    .min(0)
    .max(60 * 24 * 30)
    .optional(),
});

export const CreateAutomationStepSchema = z
  .object({
    actionType: AutomationActionTypeSchema,
    actionConfig: z.record(z.unknown()),
    continueOnError: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    try {
      parseAutomationActionConfig(value.actionType, value.actionConfig);
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
            : "Invalid automation action config",
      });
    }
  });

const AutomationDefinitionFieldsSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  scopeType: AutomationScopeSchema,
  scopeId: z.string().uuid().optional().nullable(),
  status: AutomationStatusSchema.optional(),
  executionMode: AutomationExecutionModeSchema.optional(),
  suppressLegacyWorkflows: z.boolean().optional(),
  triggers: z.array(CreateAutomationTriggerSchema).min(1),
  steps: z.array(CreateAutomationStepSchema).min(1),
});

function validateActionCompatibility(
  value: {
    triggers?: Array<{ eventName?: string }>;
    steps?: Array<{ actionType?: string }>;
  },
  ctx: z.RefinementCtx,
) {
  if (!value.triggers || !value.steps) {
    return;
  }

  const triggerEvents = value.triggers.map((trigger) => trigger.eventName);

  for (const [index, step] of value.steps.entries()) {
    const hasCompatibleTrigger = triggerEvents.some(
      (eventName) =>
        eventName != null &&
        step.actionType != null &&
        isAutomationActionAllowedForEvent(
          step.actionType as z.infer<typeof AutomationActionTypeSchema>,
          eventName as z.infer<typeof AutomationTriggerEventSchema>,
        ),
    );

    if (!hasCompatibleTrigger) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["steps", index, "actionType"],
        message: `Action "${step.actionType}" is not compatible with the selected trigger set`,
      });
    }
  }
}

export const CreateAutomationDefinitionSchema =
  AutomationDefinitionFieldsSchema.superRefine(validateActionCompatibility);

export const UpdateAutomationDefinitionSchema =
  AutomationDefinitionFieldsSchema.partial().superRefine(
    validateActionCompatibility,
  );

export const GetAutomationDefinitionsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => Math.max(1, parseInt(v || "1", 10) || 1)),
  limit: z
    .string()
    .optional()
    .transform((v) =>
      Math.min(100, Math.max(1, parseInt(v || "10", 10) || 10)),
    ),
  search: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  status: AutomationStatusSchema.optional(),
  scopeType: AutomationScopeSchema.optional(),
});

export const GetAutomationRunsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) =>
      Math.min(100, Math.max(1, parseInt(v || "20", 10) || 20)),
    ),
});

export const ReplayAutomationEventSchema = z.object({
  reprocessFromStart: z.boolean().optional().default(true),
});

export type CreateAutomationTriggerDto = z.infer<
  typeof CreateAutomationTriggerSchema
>;
export type CreateAutomationStepDto = z.infer<
  typeof CreateAutomationStepSchema
>;
export type CreateAutomationDefinitionDto = z.infer<
  typeof CreateAutomationDefinitionSchema
>;
export type UpdateAutomationDefinitionDto = z.infer<
  typeof UpdateAutomationDefinitionSchema
>;
export type GetAutomationDefinitionsQueryDto = z.infer<
  typeof GetAutomationDefinitionsQuerySchema
>;
export type GetAutomationRunsQueryDto = z.infer<
  typeof GetAutomationRunsQuerySchema
>;
export type ReplayAutomationEventDto = z.infer<
  typeof ReplayAutomationEventSchema
>;
