import type {
  WorkflowActionValue,
  WorkflowTriggerValue,
} from "./workflow-enums";

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

export interface CrmWorkflowTemplateRule {
  trigger: WorkflowTriggerValue;
  triggerStageId?: string | null;
  action: WorkflowActionValue;
  actionConfig: Record<string, unknown>;
  ruleOrder?: number;
}

export interface CrmWorkflowTemplate {
  templateKey: string;
  pipelineType: "NEW_SALES" | "REMARKETING" | "REPURCHASE";
  name: string;
  description: string;
  category: WorkflowTemplateCategory;
  difficulty: "BEGINNER" | "INTERMEDIATE";
  recommended: boolean;
  supportedObjects: readonly ("DEAL" | "CONTACT" | "TASK" | "NOTIFICATION")[];
  version: number;
  isActive?: boolean;
  rules: CrmWorkflowTemplateRule[];
}

export const CRM_WORKFLOW_TEMPLATES: readonly CrmWorkflowTemplate[] = [
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
] as const;

export function getCrmWorkflowTemplateByKey(
  templateKey: string,
): CrmWorkflowTemplate | undefined {
  return CRM_WORKFLOW_TEMPLATES.find(
    (template) => template.templateKey === templateKey,
  );
}
