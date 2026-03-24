/**
 * Must stay aligned with Prisma enums `WorkflowTrigger` and `WorkflowAction`.
 */

export const WORKFLOW_TRIGGER_VALUES = [
  "STAGE_ENTER",
  "STAGE_EXIT",
  "DEAL_CREATED",
  "DEAL_WON",
  "DEAL_LOST",
  "PURCHASE_COUNT_CHANGED",
] as const;

export type WorkflowTriggerValue = (typeof WORKFLOW_TRIGGER_VALUES)[number];

export const WORKFLOW_ACTION_VALUES = [
  "CREATE_TASK",
  "SEND_NOTIFICATION",
  "MOVE_STAGE",
  "UPDATE_FIELD",
  "CREATE_ACTIVITY",
  "CREATE_DEAL",
  "UPDATE_CONTACT_FIELD",
  "APPLY_TAG",
  "REMOVE_TAG",
] as const;

export type WorkflowActionValue = (typeof WORKFLOW_ACTION_VALUES)[number];
