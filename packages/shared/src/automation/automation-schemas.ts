import { z } from "zod";
import {
  AUTOMATION_ACTION_TYPE_VALUES,
  AUTOMATION_EXECUTION_MODE_VALUES,
  AUTOMATION_SCOPE_VALUES,
  AUTOMATION_STATUS_VALUES,
  AUTOMATION_TRIGGER_EVENT_VALUES,
  type AutomationActionTypeValue,
  type AutomationTriggerEventValue,
  WORK_ITEM_PRIORITY_VALUES,
  WORK_ITEM_TYPE_VALUES,
} from "./automation-enums";

const CRM_DEAL_EVENT_NAMES = [
  "crm.deal.created",
  "crm.deal.stage_changed",
] as const;

const CRM_EVENT_NAMES = [
  "crm.deal.created",
  "crm.deal.stage_changed",
  "crm.contact.created",
  "crm.contact.updated",
  "crm.company.created",
  "crm.company.updated",
  "crm.activity.created",
  "crm.lead.created",
  "crm.lead.assigned",
  "crm.lead.converted",
] as const;

const INVENTORY_EVENT_NAMES = [
  "inventory.stock.adjusted",
  "inventory.stock.set",
  "inventory.stock.low_detected",
  "inventory.stock.threshold_crossed",
] as const;

export const AUTOMATION_ACTION_ALLOWED_EVENTS: Record<
  AutomationActionTypeValue,
  readonly AutomationTriggerEventValue[]
> = {
  "workitem.create": AUTOMATION_TRIGGER_EVENT_VALUES,
  "notification.send": AUTOMATION_TRIGGER_EVENT_VALUES,
  "transfer.create_draft": INVENTORY_EVENT_NAMES,
  "record.update_field": AUTOMATION_TRIGGER_EVENT_VALUES,
  "crm.contact.update": AUTOMATION_TRIGGER_EVENT_VALUES,
  "crm.company.update": AUTOMATION_TRIGGER_EVENT_VALUES,
  "crm.deal.move_stage": CRM_DEAL_EVENT_NAMES,
  "crm.activity.create": CRM_EVENT_NAMES,
  "webhook.emit": AUTOMATION_TRIGGER_EVENT_VALUES,
};

export const RECORD_UPDATE_FIELD_ALLOWLIST = {
  DEAL: ["status", "stage", "assignedToId", "expectedCloseDate"],
  CONTACT: ["source", "email", "phone", "ownerId", "status"],
  COMPANY: ["name", "website", "address", "phone"],
  MEMBER: ["name", "email", "notes", "memberStatus"],
  PRODUCT: [
    "name",
    "description",
    "subCategory",
    "vendorId",
    "costPrice",
    "mrp",
  ],
  CATEGORY: ["name", "description"],
  VENDOR: ["name", "contact", "address", "phone"],
  LOCATION: ["name", "address", "isActive", "isDefaultWarehouse"],
  SALE: ["notes"],
  TRANSFER: ["notes"],
  WORK_ITEM: ["status", "priority", "assignedToId", "dueDate"],
} as const;

export const AutomationScopeSchema = z.enum(AUTOMATION_SCOPE_VALUES);
export const AutomationStatusSchema = z.enum(AUTOMATION_STATUS_VALUES);
export const AutomationExecutionModeSchema = z.enum(
  AUTOMATION_EXECUTION_MODE_VALUES,
);
export const AutomationTriggerEventSchema = z.enum(
  AUTOMATION_TRIGGER_EVENT_VALUES,
);
export const AutomationActionTypeSchema = z.enum(AUTOMATION_ACTION_TYPE_VALUES);
export const WorkItemTypeSchema = z.enum(WORK_ITEM_TYPE_VALUES);
export const WorkItemPrioritySchema = z.enum(WORK_ITEM_PRIORITY_VALUES);

const AUTOMATION_CONDITION_OPERATORS = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "contains",
  "in",
  "exists",
] as const;

/** True if the value can be used for operator `in` (before normalization to an array). */
export function isValidAutomationInConditionValue(value: unknown): boolean {
  if (Array.isArray(value)) return true;
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return false;
    if (t.startsWith("[")) {
      try {
        return Array.isArray(JSON.parse(t));
      } catch {
        return false;
      }
    }
    return true;
  }
  return false;
}

export function normalizeAutomationInConditionValue(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    if (trimmed.includes(",")) {
      return trimmed
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return trimmed ? [trimmed] : [];
  }
  return [];
}

export const AutomationConditionSchema = z
  .object({
    path: z.string().min(1),
    operator: z.enum(AUTOMATION_CONDITION_OPERATORS),
    value: z.unknown().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.operator === "exists") {
      return;
    }
    if (data.operator === "in") {
      if (!isValidAutomationInConditionValue(data.value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["value"],
          message:
            'For "in", provide a JSON array (e.g. ["a","b"]), comma-separated values, or a single value',
        });
      }
      return;
    }
    if (
      data.operator === "gt" ||
      data.operator === "gte" ||
      data.operator === "lt" ||
      data.operator === "lte"
    ) {
      if (data.value === undefined || data.value === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["value"],
          message: "A numeric value is required for this operator",
        });
        return;
      }
      const n = Number(data.value);
      if (!Number.isFinite(n)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["value"],
          message: "Value must be a finite number",
        });
      }
    }
  })
  .transform((data) => {
    if (data.operator === "in" && data.value !== undefined) {
      return {
        ...data,
        value: normalizeAutomationInConditionValue(data.value),
      };
    }
    if (
      (data.operator === "gt" ||
        data.operator === "gte" ||
        data.operator === "lt" ||
        data.operator === "lte") &&
      data.value !== undefined &&
      data.value !== null
    ) {
      return { ...data, value: Number(data.value) };
    }
    return data;
  });

export type AutomationCondition = z.infer<typeof AutomationConditionSchema>;

export const WorkItemCreateActionConfigSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional().nullable(),
  type: WorkItemTypeSchema.default("TASK"),
  priority: WorkItemPrioritySchema.default("MEDIUM"),
  assignedToId: z.string().uuid().optional().nullable(),
  dueInHours: z
    .number()
    .int()
    .min(0)
    .max(24 * 365)
    .optional(),
  prefillPayloadPath: z.string().min(1).optional(),
  metadata: z.record(z.unknown()).optional(),
  links: z
    .array(
      z.object({
        entityType: z.string().min(1).max(100),
        entityIdTemplate: z.string().min(1).max(255),
      }),
    )
    .optional(),
});

export type WorkItemCreateActionConfig = z.infer<
  typeof WorkItemCreateActionConfigSchema
>;

export const NotificationSendActionConfigSchema = z.object({
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(5000),
  userId: z.string().uuid().optional().nullable(),
  type: z.string().min(1).max(100).default("TASK_DUE"),
});

export type NotificationSendActionConfig = z.infer<
  typeof NotificationSendActionConfigSchema
>;

export const TransferCreateDraftActionConfigSchema = z.object({
  payloadPath: z.string().min(1).default("suggestedTransfer"),
  notes: z.string().max(5000).optional().nullable(),
});

export type TransferCreateDraftActionConfig = z.infer<
  typeof TransferCreateDraftActionConfigSchema
>;

export const RecordUpdateFieldActionConfigSchema = z
  .object({
    entityType: z.enum(
      Object.keys(RECORD_UPDATE_FIELD_ALLOWLIST) as [
        keyof typeof RECORD_UPDATE_FIELD_ALLOWLIST,
        ...(keyof typeof RECORD_UPDATE_FIELD_ALLOWLIST)[],
      ],
    ),
    entityIdTemplate: z.string().min(1).max(255),
    field: z.string().min(1).max(100),
    value: z.unknown(),
  })
  .superRefine((value, ctx) => {
    const allowedFields = RECORD_UPDATE_FIELD_ALLOWLIST[value.entityType];
    if (!allowedFields.includes(value.field as never)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["field"],
        message: `Field "${value.field}" is not updatable for ${value.entityType}`,
      });
    }
  });

export type RecordUpdateFieldActionConfig = z.infer<
  typeof RecordUpdateFieldActionConfigSchema
>;

const CONTACT_UPDATE_ALLOWLIST = RECORD_UPDATE_FIELD_ALLOWLIST.CONTACT;
const CONTACT_UPDATE_FIELDS = [...CONTACT_UPDATE_ALLOWLIST] as [
  (typeof CONTACT_UPDATE_ALLOWLIST)[number],
  ...(typeof CONTACT_UPDATE_ALLOWLIST)[number][],
];

export const CrmContactUpdateActionConfigSchema = z
  .object({
    contactIdTemplate: z.string().min(1).max(255).default("{{event.entityId}}"),
    field: z.enum(CONTACT_UPDATE_FIELDS),
    value: z.unknown(),
  })
  .superRefine((value, ctx) => {
    if (!CONTACT_UPDATE_ALLOWLIST.includes(value.field)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["field"],
        message: `Field "${value.field}" is not updatable for CONTACT`,
      });
    }
  });

export type CrmContactUpdateActionConfig = z.infer<
  typeof CrmContactUpdateActionConfigSchema
>;

const COMPANY_UPDATE_ALLOWLIST = RECORD_UPDATE_FIELD_ALLOWLIST.COMPANY;
const COMPANY_UPDATE_FIELDS = [...COMPANY_UPDATE_ALLOWLIST] as [
  (typeof COMPANY_UPDATE_ALLOWLIST)[number],
  ...(typeof COMPANY_UPDATE_ALLOWLIST)[number][],
];

export const CrmCompanyUpdateActionConfigSchema = z
  .object({
    companyIdTemplate: z.string().min(1).max(255).default("{{event.entityId}}"),
    field: z.enum(COMPANY_UPDATE_FIELDS),
    value: z.unknown(),
  })
  .superRefine((value, ctx) => {
    if (!COMPANY_UPDATE_ALLOWLIST.includes(value.field)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["field"],
        message: `Field "${value.field}" is not updatable for COMPANY`,
      });
    }
  });

export type CrmCompanyUpdateActionConfig = z.infer<
  typeof CrmCompanyUpdateActionConfigSchema
>;

export const CrmDealMoveStageActionConfigSchema = z.object({
  dealIdTemplate: z.string().min(1).max(255).default("{{event.entityId}}"),
  targetStageId: z.string().min(1).max(100),
  targetPipelineId: z.string().uuid().optional(),
});

export type CrmDealMoveStageActionConfig = z.infer<
  typeof CrmDealMoveStageActionConfigSchema
>;

export const CrmActivityCreateActionConfigSchema = z.object({
  type: z.enum(["CALL", "EMAIL", "MEETING"]).default("CALL"),
  subject: z.string().min(1).max(500),
  notes: z.string().max(5000).optional().nullable(),
  activityAtPath: z.string().min(1).optional(),
});

export type CrmActivityCreateActionConfig = z.infer<
  typeof CrmActivityCreateActionConfigSchema
>;

export const WebhookEmitActionConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(["POST", "PUT"]).default("POST"),
  payloadPath: z.string().min(1).optional(),
  timeoutSeconds: z.number().int().min(1).max(60).optional(),
});

export type WebhookEmitActionConfig = z.infer<
  typeof WebhookEmitActionConfigSchema
>;

export const AutomationActionConfigSchemas = {
  "workitem.create": WorkItemCreateActionConfigSchema,
  "notification.send": NotificationSendActionConfigSchema,
  "transfer.create_draft": TransferCreateDraftActionConfigSchema,
  "record.update_field": RecordUpdateFieldActionConfigSchema,
  "crm.contact.update": CrmContactUpdateActionConfigSchema,
  "crm.company.update": CrmCompanyUpdateActionConfigSchema,
  "crm.deal.move_stage": CrmDealMoveStageActionConfigSchema,
  "crm.activity.create": CrmActivityCreateActionConfigSchema,
  "webhook.emit": WebhookEmitActionConfigSchema,
} as const;

export type AutomationActionConfigValue =
  | WorkItemCreateActionConfig
  | NotificationSendActionConfig
  | TransferCreateDraftActionConfig
  | RecordUpdateFieldActionConfig
  | CrmContactUpdateActionConfig
  | CrmCompanyUpdateActionConfig
  | CrmDealMoveStageActionConfig
  | CrmActivityCreateActionConfig
  | WebhookEmitActionConfig;

export function parseAutomationActionConfig(
  actionType: z.infer<typeof AutomationActionTypeSchema>,
  config: unknown,
): AutomationActionConfigValue {
  return AutomationActionConfigSchemas[actionType].parse(config);
}

export function isAutomationActionAllowedForEvent(
  actionType: z.infer<typeof AutomationActionTypeSchema>,
  eventName: z.infer<typeof AutomationTriggerEventSchema>,
): boolean {
  return AUTOMATION_ACTION_ALLOWED_EVENTS[actionType].includes(eventName);
}
