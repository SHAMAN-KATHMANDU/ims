import { z } from "zod";
import {
  AUTOMATION_ACTION_TYPE_VALUES,
  AUTOMATION_EXECUTION_MODE_VALUES,
  AUTOMATION_SCOPE_VALUES,
  AUTOMATION_STATUS_VALUES,
  AUTOMATION_TRIGGER_EVENT_VALUES,
  AutomationConditionSchema,
  isAutomationActionAllowedForEvent,
  parseAndValidateAutomationFlowGraph,
  parseAutomationActionConfig,
} from "@repo/shared";

export const AutomationTriggerFormSchema = z.object({
  eventName: z.enum(AUTOMATION_TRIGGER_EVENT_VALUES),
  conditions: z.array(AutomationConditionSchema).optional().default([]),
  delayMinutes: z.coerce.number().int().min(0).optional().default(0),
});

export const AutomationStepFormSchema = z
  .object({
    actionType: z.enum(AUTOMATION_ACTION_TYPE_VALUES),
    actionConfig: z.record(z.unknown()).default({}),
    continueOnError: z.boolean().default(false),
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
      }
    }
  });

export function hasPreservedBranchingFlowGraphShape(value: unknown): boolean {
  return (
    value !== undefined &&
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

export const AutomationDefinitionFormSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(255),
    description: z.string().max(1000).optional().nullable(),
    scopeType: z.enum(AUTOMATION_SCOPE_VALUES),
    scopeId: z.string().uuid().optional().nullable().or(z.literal("")),
    status: z.enum(AUTOMATION_STATUS_VALUES).default("ACTIVE"),
    executionMode: z.enum(AUTOMATION_EXECUTION_MODE_VALUES).default("LIVE"),
    suppressLegacyWorkflows: z.boolean().default(false),
    triggers: z.array(AutomationTriggerFormSchema).min(1),
    steps: z.array(AutomationStepFormSchema),
    /**
     * API-authored branching graph (if/switch). When set, `steps` must be empty;
     * the graph is preserved on save and is not editable in the linear/canvas UI yet.
     */
    preservedBranchingFlowGraph: z.unknown().optional(),
    /**
     * When true with a preserved graph, the flow tab shows the branch canvas editor
     * (canonical if/switch shapes). Not sent to the API.
     */
    branchingCanvasAuthoring: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    const graphLocked = hasPreservedBranchingFlowGraphShape(
      value.preservedBranchingFlowGraph,
    );

    if (graphLocked && value.steps.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["steps"],
        message:
          "Branching graph is locked from the API; remove steps or clear preservedBranchingFlowGraph",
      });
      return;
    }

    if (!graphLocked && value.steps.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["steps"],
        message:
          "At least one step is required when no branching graph is locked",
      });
      return;
    }

    if (graphLocked) {
      const eventNames = value.triggers.map((t) => t.eventName);
      const graphValidation = parseAndValidateAutomationFlowGraph(
        value.preservedBranchingFlowGraph,
        eventNames,
      );
      if (graphValidation.ok === false) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["preservedBranchingFlowGraph"],
          message: graphValidation.errors.join("; "),
        });
      }
    }

    const triggerEvents = value.triggers.map((trigger) => trigger.eventName);

    for (const [index, step] of value.steps.entries()) {
      const hasCompatibleTrigger = triggerEvents.some((eventName) =>
        isAutomationActionAllowedForEvent(step.actionType, eventName),
      );

      if (!hasCompatibleTrigger) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["steps", index, "actionType"],
          message: `Action "${step.actionType}" is not compatible with the selected trigger set`,
        });
      }
    }
  })
  .superRefine((value, ctx) => {
    if (value.scopeType === "GLOBAL") {
      return;
    }
    const raw = (value.scopeId ?? "").trim();
    if (!z.string().uuid().safeParse(raw).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scopeId"],
        message:
          "Select a scope target (pipeline, warehouse, or product variation UUID).",
      });
    }
  });

export type AutomationDefinitionFormValues = z.infer<
  typeof AutomationDefinitionFormSchema
>;
