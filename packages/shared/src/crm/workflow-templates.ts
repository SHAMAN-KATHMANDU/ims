import type {
  WorkflowActionValue,
  WorkflowTriggerValue,
} from "./workflow-enums";

export interface CrmWorkflowTemplateRule {
  trigger: WorkflowTriggerValue;
  triggerStageId?: string | null;
  action: WorkflowActionValue;
  actionConfig: Record<string, unknown>;
  ruleOrder?: number;
}

export interface CrmWorkflowTemplate {
  pipelineType: "NEW_SALES" | "REMARKETING" | "REPURCHASE";
  name: string;
  isActive?: boolean;
  rules: CrmWorkflowTemplateRule[];
}

export const CRM_WORKFLOW_TEMPLATES: readonly CrmWorkflowTemplate[] = [
  {
    pipelineType: "NEW_SALES",
    name: "Sales won follow-up",
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
    pipelineType: "NEW_SALES",
    name: "Sales stalled nurture",
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
    pipelineType: "REMARKETING",
    name: "Remarketing re-engagement",
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
    pipelineType: "REPURCHASE",
    name: "Repurchasing progression",
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
] as const;
