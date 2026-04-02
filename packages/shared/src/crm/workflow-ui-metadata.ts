import type {
  WorkflowActionValue,
  WorkflowTriggerValue,
} from "./workflow-enums";

export type WorkflowTriggerMeta = {
  label: string;
  description: string;
};

export type WorkflowActionMeta = {
  label: string;
  description: string;
};

/**
 * Single source for pipeline workflow trigger labels and help text (UI).
 * Align with Prisma `WorkflowTrigger` values.
 */
export const WORKFLOW_TRIGGER_META: Record<
  WorkflowTriggerValue,
  WorkflowTriggerMeta
> = {
  STAGE_ENTER: {
    label: "Stage entered",
    description: "When a deal moves into the selected stage.",
  },
  STAGE_EXIT: {
    label: "Stage exited",
    description: "When a deal leaves the selected stage.",
  },
  DEAL_CREATED: {
    label: "Deal created",
    description: "When a new deal is added to this pipeline.",
  },
  DEAL_WON: {
    label: "Deal won",
    description: "When a deal is marked won.",
  },
  DEAL_LOST: {
    label: "Deal lost",
    description: "When a deal is marked lost.",
  },
  PURCHASE_COUNT_CHANGED: {
    label: "Purchase count changed",
    description: "When linked purchase activity count changes for the contact.",
  },
};

/**
 * Single source for pipeline workflow action labels and help text (UI).
 * Align with Prisma `WorkflowAction` values.
 */
export const WORKFLOW_ACTION_META: Record<
  WorkflowActionValue,
  WorkflowActionMeta
> = {
  CREATE_TASK: {
    label: "Create task",
    description: "Add a task for a user with optional due date.",
  },
  SEND_NOTIFICATION: {
    label: "Send notification",
    description: "Show an in-app notification to selected users.",
  },
  MOVE_STAGE: {
    label: "Move stage",
    description: "Move the deal to another stage on this pipeline.",
  },
  UPDATE_FIELD: {
    label: "Update field",
    description: "Set a custom field value on the deal.",
  },
  CREATE_ACTIVITY: {
    label: "Create activity",
    description: "Log a call, meeting, or note on the deal.",
  },
  CREATE_DEAL: {
    label: "Create deal",
    description: "Create a new deal (e.g. on another pipeline).",
  },
  UPDATE_CONTACT_FIELD: {
    label: "Update contact field",
    description: "Change a field on the linked contact.",
  },
  APPLY_TAG: {
    label: "Apply tag",
    description: "Add a tag to the contact.",
  },
  REMOVE_TAG: {
    label: "Remove tag",
    description: "Remove a tag from the contact.",
  },
};

/** Short labels for compact display (maps, tables). */
export const WORKFLOW_TRIGGER_LABELS: Record<WorkflowTriggerValue, string> =
  Object.fromEntries(
    (
      Object.entries(WORKFLOW_TRIGGER_META) as [
        WorkflowTriggerValue,
        WorkflowTriggerMeta,
      ][]
    ).map(([k, v]) => [k, v.label]),
  ) as Record<WorkflowTriggerValue, string>;

export const WORKFLOW_ACTION_LABELS: Record<WorkflowActionValue, string> =
  Object.fromEntries(
    (
      Object.entries(WORKFLOW_ACTION_META) as [
        WorkflowActionValue,
        WorkflowActionMeta,
      ][]
    ).map(([k, v]) => [k, v.label]),
  ) as Record<WorkflowActionValue, string>;
