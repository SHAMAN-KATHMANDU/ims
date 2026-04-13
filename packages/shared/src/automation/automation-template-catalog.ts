import { z } from "zod";
import {
  AutomationActionTypeSchema,
  AutomationConditionSchema,
  AutomationExecutionModeSchema,
  AutomationScopeSchema,
  AutomationStatusSchema,
  AutomationTriggerEventSchema,
} from "./automation-schemas";

/** Template taxonomy for gallery filters (aligned with workflow template style). */
export const AUTOMATION_TEMPLATE_CATEGORIES = [
  "SALES",
  "INVENTORY",
  "CRM",
  "OPERATIONS",
] as const;

export type AutomationTemplateCategory =
  (typeof AUTOMATION_TEMPLATE_CATEGORIES)[number];

export const AUTOMATION_TEMPLATE_DIFFICULTIES = [
  "BEGINNER",
  "INTERMEDIATE",
] as const;

export type AutomationTemplateDifficulty =
  (typeof AUTOMATION_TEMPLATE_DIFFICULTIES)[number];

const AutomationTemplateTriggerSchema = z.object({
  eventName: AutomationTriggerEventSchema,
  conditions: z.array(AutomationConditionSchema).optional().default([]),
  delayMinutes: z.number().int().min(0).optional().default(0),
});

const AutomationTemplateStepSchema = z.object({
  actionType: AutomationActionTypeSchema,
  actionConfig: z.record(z.unknown()),
  continueOnError: z.boolean().optional().default(false),
});

/** Seed values for the automation builder form (trusted catalog data). */
export const AutomationTemplateFormValuesSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  scopeType: AutomationScopeSchema,
  scopeId: z.string().uuid().optional().nullable().or(z.literal("")),
  status: AutomationStatusSchema,
  executionMode: AutomationExecutionModeSchema,
  suppressLegacyWorkflows: z.boolean(),
  triggers: z.array(AutomationTemplateTriggerSchema).min(1),
  steps: z.array(AutomationTemplateStepSchema).min(1),
});

export type AutomationTemplateFormValues = z.infer<
  typeof AutomationTemplateFormValuesSchema
>;

export interface AutomationTemplateCatalogEntry {
  id: string;
  name: string;
  description: string;
  category: AutomationTemplateCategory;
  difficulty: AutomationTemplateDifficulty;
  tags: string[];
  whenItRuns: string[];
  whatItDoes: string[];
  values: AutomationTemplateFormValues;
}

export const AUTOMATION_TEMPLATE_CATEGORY_LABELS: Record<
  AutomationTemplateCategory,
  string
> = {
  SALES: "Sales",
  INVENTORY: "Inventory",
  CRM: "CRM",
  OPERATIONS: "Operations",
};

/**
 * Built-in automation templates. Keep in sync with runtime action/trigger allowlists.
 */
export const AUTOMATION_TEMPLATE_CATALOG: AutomationTemplateCatalogEntry[] = [
  {
    id: "sales-follow-up",
    name: "Sales follow-up",
    description: "Create a work item after a high-value sale.",
    category: "SALES",
    difficulty: "BEGINNER",
    tags: ["sale", "follow-up", "work item"],
    whenItRuns: [
      "Fires when a sale is created and the order total meets your threshold.",
      "Uses event sales.sale.high_value_created (example condition: total ≥ 5000).",
    ],
    whatItDoes: [
      "Creates a high-priority FOLLOW_UP work item for your team.",
      "Includes the sale code in the task description for quick lookup.",
    ],
    values: {
      name: "High-value sale follow-up",
      description: "Assign a follow-up task when a high-value sale is created.",
      scopeType: "LOCATION",
      scopeId: "",
      status: "ACTIVE",
      executionMode: "LIVE",
      suppressLegacyWorkflows: false,
      triggers: [
        {
          eventName: "sales.sale.high_value_created",
          conditions: [{ path: "total", operator: "gte", value: 5000 }],
          delayMinutes: 0,
        },
      ],
      steps: [
        {
          actionType: "workitem.create",
          actionConfig: {
            title: "Follow up on premium sale",
            type: "FOLLOW_UP",
            priority: "HIGH",
            description: "Reach out after sale {{event.payload.saleCode}}",
          },
          continueOnError: false,
        },
      ],
    },
  },
  {
    id: "inventory-restock",
    name: "Inventory restock",
    description: "Draft a transfer when stock drops below threshold.",
    category: "INVENTORY",
    difficulty: "BEGINNER",
    tags: ["stock", "transfer", "warehouse"],
    whenItRuns: [
      "Fires when the platform emits a low-stock signal for a variation.",
      "Uses event inventory.stock.low_detected.",
      "After applying: set Scope to Location and pick the warehouse (or Global for all sites), then save.",
    ],
    whatItDoes: [
      "Opens a transfer draft using suggested movement data from the event.",
      "Lets staff review and confirm before stock moves.",
    ],
    values: {
      name: "Inventory restock draft",
      description: "Create a transfer draft when low stock is detected.",
      scopeType: "LOCATION",
      scopeId: "",
      status: "ACTIVE",
      executionMode: "LIVE",
      suppressLegacyWorkflows: false,
      triggers: [
        {
          eventName: "inventory.stock.low_detected",
          conditions: [],
          delayMinutes: 0,
        },
      ],
      steps: [
        {
          actionType: "transfer.create_draft",
          actionConfig: {
            payloadPath: "suggestedTransfer",
          },
          continueOnError: false,
        },
      ],
    },
  },
  {
    id: "lead-routing",
    name: "Lead routing",
    description:
      "Create activity and update contact status after lead conversion.",
    category: "CRM",
    difficulty: "INTERMEDIATE",
    tags: ["lead", "contact", "activity"],
    whenItRuns: [
      "Fires when a lead is converted to a contact or customer record.",
      "Uses event crm.lead.converted.",
    ],
    whatItDoes: [
      "Sets the contact status to CUSTOMER (adjust field/value after install if needed).",
      "Logs a CALL-type activity so the team sees follow-up context.",
    ],
    values: {
      name: "Lead conversion routing",
      description: "Keep CRM records in sync when a lead converts.",
      scopeType: "GLOBAL",
      scopeId: "",
      status: "ACTIVE",
      executionMode: "LIVE",
      suppressLegacyWorkflows: false,
      triggers: [
        {
          eventName: "crm.lead.converted",
          conditions: [],
          delayMinutes: 0,
        },
      ],
      steps: [
        {
          actionType: "crm.contact.update",
          actionConfig: {
            contactIdTemplate: "{{event.payload.contactId}}",
            field: "status",
            value: "CUSTOMER",
          },
          continueOnError: false,
        },
        {
          actionType: "crm.activity.create",
          actionConfig: {
            type: "CALL",
            subject: "Converted lead follow-up",
          },
          continueOnError: true,
        },
      ],
    },
  },
  {
    id: "new-deal-task",
    name: "New deal checklist",
    description: "Create a task when a new deal is created.",
    category: "CRM",
    difficulty: "BEGINNER",
    tags: ["deal", "task", "pipeline"],
    whenItRuns: [
      "Fires when a new deal record is created.",
      "Uses event crm.deal.created.",
    ],
    whatItDoes: [
      "Creates a medium-priority task so someone qualifies or enriches the deal.",
    ],
    values: {
      name: "New deal — first touch",
      description: "Assign a task when a deal is created.",
      scopeType: "GLOBAL",
      scopeId: "",
      status: "ACTIVE",
      executionMode: "SHADOW",
      suppressLegacyWorkflows: false,
      triggers: [
        {
          eventName: "crm.deal.created",
          conditions: [],
          delayMinutes: 0,
        },
      ],
      steps: [
        {
          actionType: "workitem.create",
          actionConfig: {
            title: "Review new deal",
            type: "TASK",
            priority: "MEDIUM",
            description: "New deal created — review details and next steps.",
          },
          continueOnError: false,
        },
      ],
    },
  },
  {
    id: "stock-threshold-notify",
    name: "Stock threshold alert",
    description: "Notify staff when inventory crosses a configured threshold.",
    category: "INVENTORY",
    difficulty: "BEGINNER",
    tags: ["stock", "alert", "notification"],
    whenItRuns: [
      "Fires when stock crosses a threshold for a variation.",
      "Uses event inventory.stock.threshold_crossed.",
    ],
    whatItDoes: [
      "Sends an in-app style notification (configure recipient user in the action after install).",
    ],
    values: {
      name: "Threshold stock alert",
      description: "Notify when inventory threshold is crossed.",
      scopeType: "LOCATION",
      scopeId: "",
      status: "ACTIVE",
      executionMode: "LIVE",
      suppressLegacyWorkflows: false,
      triggers: [
        {
          eventName: "inventory.stock.threshold_crossed",
          conditions: [],
          delayMinutes: 0,
        },
      ],
      steps: [
        {
          actionType: "notification.send",
          actionConfig: {
            title: "Stock threshold crossed",
            message:
              "Inventory threshold event for variation — review stock levels.",
            type: "TASK_DUE",
          },
          continueOnError: false,
        },
      ],
    },
  },
];

export function getAutomationTemplatesByCategory(
  category: AutomationTemplateCategory | "ALL",
): AutomationTemplateCatalogEntry[] {
  if (category === "ALL") return [...AUTOMATION_TEMPLATE_CATALOG];
  return AUTOMATION_TEMPLATE_CATALOG.filter((t) => t.category === category);
}

export function searchAutomationTemplates(
  query: string,
): AutomationTemplateCatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...AUTOMATION_TEMPLATE_CATALOG];
  return AUTOMATION_TEMPLATE_CATALOG.filter((t) => {
    const hay = [
      t.name,
      t.description,
      ...t.tags,
      ...t.whenItRuns,
      ...t.whatItDoes,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}
