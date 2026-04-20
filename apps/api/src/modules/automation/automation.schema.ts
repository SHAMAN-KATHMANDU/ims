import { z } from "zod";
import {
  AutomationActionTypeSchema,
  AutomationConditionSchema,
  AutomationExecutionModeSchema,
  AutomationScopeSchema,
  AutomationStatusSchema,
  AutomationTriggerEventSchema,
  isAutomationActionAllowedForEvent,
  parseAndValidateAutomationFlowGraph,
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

function hasFlowGraphObject(flowGraph: unknown): boolean {
  return (
    flowGraph !== undefined &&
    flowGraph !== null &&
    typeof flowGraph === "object" &&
    !Array.isArray(flowGraph)
  );
}

const AutomationDefinitionFieldsBaseSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  scopeType: AutomationScopeSchema,
  scopeId: z.string().uuid().optional().nullable(),
  status: AutomationStatusSchema.optional(),
  executionMode: AutomationExecutionModeSchema.optional(),
  suppressLegacyWorkflows: z.boolean().optional(),
  triggers: z.array(CreateAutomationTriggerSchema).min(1),
  steps: z.array(CreateAutomationStepSchema).default([]),
  /** Phase 3 DAG. When set, `steps` must be empty (BR-19). */
  flowGraph: z.unknown().optional().nullable(),
});

export const CreateAutomationDefinitionSchema =
  AutomationDefinitionFieldsBaseSchema.superRefine((value, ctx) => {
    const hasGraph = hasFlowGraphObject(value.flowGraph);

    if (hasGraph && value.steps.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["steps"],
        message:
          "When flowGraph is set, steps must be empty (author actions inside the graph only)",
      });
    }

    if (!hasGraph && value.steps.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["steps"],
        message: "At least one step is required when flowGraph is not provided",
      });
    }

    if (hasGraph) {
      const events = value.triggers.map((t) => t.eventName);
      const graphValidation = parseAndValidateAutomationFlowGraph(
        value.flowGraph,
        events,
      );
      if (graphValidation.ok === false) {
        for (const msg of graphValidation.errors) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["flowGraph"],
            message: msg,
          });
        }
      }
      return;
    }

    validateActionCompatibility(value, ctx);
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

export const UpdateAutomationDefinitionSchema =
  AutomationDefinitionFieldsBaseSchema.partial().superRefine((value, ctx) => {
    if (
      hasFlowGraphObject(value.flowGraph) &&
      value.steps &&
      value.steps.length > 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["steps"],
        message:
          "When flowGraph is set, steps must be empty (author actions inside the graph only)",
      });
    }
  });

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

export const ToggleAutomationStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export const BulkToggleAutomationSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export const TestAutomationDefinitionSchema = z
  .object({
    eventName: z.string().min(1).max(200),
    payload: z.record(z.unknown()).optional(),
  })
  .transform((v) => ({ eventName: v.eventName, payload: v.payload ?? {} }));

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
export type BulkToggleAutomationDto = z.infer<
  typeof BulkToggleAutomationSchema
>;
export type TestAutomationDefinitionDto = z.infer<
  typeof TestAutomationDefinitionSchema
>;
