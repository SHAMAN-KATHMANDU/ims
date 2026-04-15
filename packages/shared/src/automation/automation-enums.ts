export const AUTOMATION_SCOPE_VALUES = [
  "GLOBAL",
  "CRM_PIPELINE",
  "LOCATION",
  "PRODUCT_VARIATION",
] as const;

export type AutomationScopeValue = (typeof AUTOMATION_SCOPE_VALUES)[number];

export const AUTOMATION_STATUS_VALUES = [
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
] as const;

export type AutomationStatusValue = (typeof AUTOMATION_STATUS_VALUES)[number];

export const AUTOMATION_EXECUTION_MODE_VALUES = ["LIVE", "SHADOW"] as const;

export type AutomationExecutionModeValue =
  (typeof AUTOMATION_EXECUTION_MODE_VALUES)[number];

export const AUTOMATION_EVENT_STATUS_VALUES = [
  "PENDING",
  "PROCESSING",
  "PROCESSED",
  "FAILED",
] as const;

export type AutomationEventStatusValue =
  (typeof AUTOMATION_EVENT_STATUS_VALUES)[number];

export const AUTOMATION_RUN_STATUS_VALUES = [
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "SKIPPED",
] as const;

export type AutomationRunStatusValue =
  (typeof AUTOMATION_RUN_STATUS_VALUES)[number];

export const AUTOMATION_TRIGGER_EVENT_VALUES = [
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
  "catalog.product.created",
  "catalog.product.updated",
  "catalog.category.created",
  "catalog.category.updated",
  "vendors.vendor.created",
  "vendors.vendor.updated",
  "locations.location.created",
  "locations.location.updated",
  "sales.sale.created",
  "sales.sale.high_value_created",
  "sales.sale.deleted",
  "inventory.stock.adjusted",
  "inventory.stock.set",
  "inventory.stock.low_detected",
  "inventory.stock.threshold_crossed",
  "transfers.transfer.created",
  "transfers.transfer.approved",
  "transfers.transfer.in_transit",
  "transfers.transfer.completed",
  "transfers.transfer.cancelled",
  "members.member.created",
  "members.member.updated",
  "members.member.status_changed",
  "workitems.created",
  "workitems.completed",
  "cart.abandoned",
] as const;

export type AutomationTriggerEventValue =
  (typeof AUTOMATION_TRIGGER_EVENT_VALUES)[number];

export const AUTOMATION_ACTION_TYPE_VALUES = [
  "workitem.create",
  "notification.send",
  "transfer.create_draft",
  "record.update_field",
  "crm.contact.update",
  "crm.company.update",
  "crm.deal.move_stage",
  "crm.activity.create",
  "webhook.emit",
] as const;

export type AutomationActionTypeValue =
  (typeof AUTOMATION_ACTION_TYPE_VALUES)[number];

export const WORK_ITEM_TYPE_VALUES = [
  "TASK",
  "APPROVAL",
  "TRANSFER_REQUEST",
  "RESTOCK_REQUEST",
  "FOLLOW_UP",
] as const;

export type WorkItemTypeValue = (typeof WORK_ITEM_TYPE_VALUES)[number];

export const WORK_ITEM_STATUS_VALUES = [
  "OPEN",
  "IN_PROGRESS",
  "BLOCKED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type WorkItemStatusValue = (typeof WORK_ITEM_STATUS_VALUES)[number];

export const WORK_ITEM_PRIORITY_VALUES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
] as const;

export type WorkItemPriorityValue = (typeof WORK_ITEM_PRIORITY_VALUES)[number];
