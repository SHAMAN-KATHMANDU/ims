import {
  AUTOMATION_TRIGGER_EVENT_VALUES,
  type AutomationActionTypeValue,
  type AutomationExecutionModeValue,
  type AutomationStatusValue,
  type AutomationTriggerEventValue,
} from "./automation-enums";

/** UI grouping for trigger event dropdowns (order in SelectGroup). */
export const AUTOMATION_EVENT_GROUP_ORDER = [
  "CRM",
  "SALES",
  "INVENTORY",
  "TRANSFERS",
  "CATALOG",
  "MEMBERS",
  "WORK_ITEMS",
  "VENDORS",
  "LOCATIONS",
  "STOREFRONT",
] as const;

export type AutomationEventGroup =
  (typeof AUTOMATION_EVENT_GROUP_ORDER)[number];

const PREFIX_TO_GROUP: Record<string, AutomationEventGroup> = {
  crm: "CRM",
  sales: "SALES",
  inventory: "INVENTORY",
  transfers: "TRANSFERS",
  catalog: "CATALOG",
  members: "MEMBERS",
  workitems: "WORK_ITEMS",
  vendors: "VENDORS",
  locations: "LOCATIONS",
  cart: "STOREFRONT",
};

export function getAutomationEventGroup(
  eventName: string,
): AutomationEventGroup {
  const prefix = eventName.split(".")[0] ?? "";
  return PREFIX_TO_GROUP[prefix] ?? "CRM";
}

export type AutomationTriggerEventCatalogEntry = {
  label: string;
  description: string;
};

/**
 * Human-facing copy for each automation trigger event. Kept in sync with
 * AUTOMATION_TRIGGER_EVENT_VALUES via automation-trigger-events.test.ts.
 */
export const AUTOMATION_TRIGGER_EVENT_CATALOG: Record<
  AutomationTriggerEventValue,
  AutomationTriggerEventCatalogEntry
> = {
  "crm.deal.created": {
    label: "Deal created",
    description: "When a new deal is created on a pipeline.",
  },
  "crm.deal.stage_changed": {
    label: "Deal stage changed",
    description: "When a deal moves from one stage to another.",
  },
  "crm.contact.created": {
    label: "Contact created",
    description: "When a new CRM contact is saved.",
  },
  "crm.contact.updated": {
    label: "Contact updated",
    description: "When an existing contact is modified.",
  },
  "crm.company.created": {
    label: "Company created",
    description: "When a new company record is created.",
  },
  "crm.company.updated": {
    label: "Company updated",
    description: "When an existing company is modified.",
  },
  "crm.activity.created": {
    label: "Activity created",
    description: "When a call, meeting, or other activity is logged.",
  },
  "crm.lead.created": {
    label: "Lead created",
    description: "When a new lead enters the CRM.",
  },
  "crm.lead.assigned": {
    label: "Lead assigned",
    description: "When a lead is assigned to a user.",
  },
  "crm.lead.converted": {
    label: "Lead converted",
    description: "When a lead becomes a contact or customer.",
  },
  "catalog.product.created": {
    label: "Product created",
    description: "When a new product is added to the catalog.",
  },
  "catalog.product.updated": {
    label: "Product updated",
    description: "When product details change.",
  },
  "catalog.category.created": {
    label: "Category created",
    description: "When a new product category is created.",
  },
  "catalog.category.updated": {
    label: "Category updated",
    description: "When a category is renamed or changed.",
  },
  "vendors.vendor.created": {
    label: "Vendor created",
    description: "When a new vendor is added.",
  },
  "vendors.vendor.updated": {
    label: "Vendor updated",
    description: "When vendor details are updated.",
  },
  "locations.location.created": {
    label: "Location created",
    description: "When a new warehouse or store location is added.",
  },
  "locations.location.updated": {
    label: "Location updated",
    description: "When location details change.",
  },
  "sales.sale.created": {
    label: "Sale created",
    description: "When a sale is completed and recorded.",
  },
  "sales.sale.high_value_created": {
    label: "High-value sale created",
    description:
      "When a sale meets your high-value threshold (e.g. large order).",
  },
  "sales.sale.deleted": {
    label: "Sale deleted",
    description: "When a sale is removed or voided.",
  },
  "inventory.stock.adjusted": {
    label: "Stock adjusted",
    description: "When on-hand quantity is manually adjusted.",
  },
  "inventory.stock.set": {
    label: "Stock set",
    description: "When stock level is set to an absolute value.",
  },
  "inventory.stock.low_detected": {
    label: "Low stock detected",
    description: "When inventory falls below the configured minimum.",
  },
  "inventory.stock.threshold_crossed": {
    label: "Stock threshold crossed",
    description: "When stock crosses a configured high or low threshold.",
  },
  "transfers.transfer.created": {
    label: "Transfer created",
    description: "When a stock transfer is initiated between locations.",
  },
  "transfers.transfer.approved": {
    label: "Transfer approved",
    description: "When a pending transfer is approved.",
  },
  "transfers.transfer.in_transit": {
    label: "Transfer in transit",
    description: "When goods are marked as in transit.",
  },
  "transfers.transfer.completed": {
    label: "Transfer completed",
    description: "When a transfer is received and closed.",
  },
  "transfers.transfer.cancelled": {
    label: "Transfer cancelled",
    description: "When a transfer is cancelled before completion.",
  },
  "members.member.created": {
    label: "Member created",
    description: "When a new staff member is added to the tenant.",
  },
  "members.member.updated": {
    label: "Member updated",
    description: "When member profile or role information changes.",
  },
  "members.member.status_changed": {
    label: "Member status changed",
    description: "When a member is activated, suspended, or similar.",
  },
  "workitems.created": {
    label: "Work item created",
    description: "When a task or follow-up work item is created.",
  },
  "workitems.completed": {
    label: "Work item completed",
    description: "When a work item is marked done.",
  },
  "cart.abandoned": {
    label: "Cart abandoned",
    description:
      "When a guest cart on the tenant website has been idle long enough to count as abandoned.",
  },
};

export const AUTOMATION_STATUS_LABELS: Record<AutomationStatusValue, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ARCHIVED: "Archived",
};

export const AUTOMATION_EXECUTION_MODE_LABELS: Record<
  AutomationExecutionModeValue,
  string
> = {
  LIVE: "Live",
  SHADOW: "Shadow",
};

export type AutomationConditionOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "in"
  | "exists";

export const AUTOMATION_CONDITION_OPERATORS: readonly AutomationConditionOperator[] =
  ["eq", "neq", "gt", "gte", "lt", "lte", "contains", "in", "exists"];

export type AutomationConditionOperatorMeta = {
  label: string;
  description: string;
};

export const AUTOMATION_CONDITION_OPERATOR_META: Record<
  AutomationConditionOperator,
  AutomationConditionOperatorMeta
> = {
  eq: {
    label: "Equals",
    description: "Value must match exactly (good for text, numbers, booleans).",
  },
  neq: {
    label: "Does not equal",
    description: "Value must differ from the comparison value.",
  },
  gt: {
    label: "Greater than",
    description: "Numeric comparison: strictly above the threshold.",
  },
  gte: {
    label: "Greater than or equal",
    description: "Numeric comparison: at or above the threshold.",
  },
  lt: {
    label: "Less than",
    description: "Numeric comparison: strictly below the threshold.",
  },
  lte: {
    label: "Less than or equal",
    description: "Numeric comparison: at or below the threshold.",
  },
  contains: {
    label: "Contains",
    description: "String appears inside the field (substring match).",
  },
  in: {
    label: "In list",
    description:
      "Value is one of several allowed values (comma-separated or JSON array).",
  },
  exists: {
    label: "Exists",
    description: "Field is present on the payload (no comparison value).",
  },
};

/** Short line for compact Select items (label only). */
export function getAutomationConditionOperatorLabel(
  op: AutomationConditionOperator,
): string {
  return AUTOMATION_CONDITION_OPERATOR_META[op].label;
}

export type AutomationActionTypeDescription = {
  label: string;
  description: string;
};

export const AUTOMATION_ACTION_TYPE_DESCRIPTIONS: Record<
  AutomationActionTypeValue,
  AutomationActionTypeDescription
> = {
  "workitem.create": {
    label: "Create work item",
    description: "Queue a task or follow-up for your team.",
  },
  "notification.send": {
    label: "Send notification",
    description: "Surface an in-app notice with title and message.",
  },
  "transfer.create_draft": {
    label: "Create transfer draft",
    description: "Start a stock transfer from event payload data.",
  },
  "record.update_field": {
    label: "Update record field",
    description: "Change a field on an entity referenced by the event.",
  },
  "crm.contact.update": {
    label: "Update CRM contact",
    description: "Set a contact field (e.g. status or owner).",
  },
  "crm.company.update": {
    label: "Update CRM company",
    description: "Set a company field (e.g. website).",
  },
  "crm.deal.move_stage": {
    label: "Move deal stage",
    description: "Move the deal to another pipeline stage.",
  },
  "crm.activity.create": {
    label: "Create CRM activity",
    description: "Log a call, email, or meeting on a record.",
  },
  "webhook.emit": {
    label: "Emit webhook",
    description: "POST JSON to an external URL.",
  },
};

/** Events grouped by UI category, in stable order within each group. */
export function getAutomationTriggerEventsByGroup(): Record<
  AutomationEventGroup,
  AutomationTriggerEventValue[]
> {
  const result = {} as Record<
    AutomationEventGroup,
    AutomationTriggerEventValue[]
  >;
  for (const g of AUTOMATION_EVENT_GROUP_ORDER) {
    result[g] = [];
  }
  for (const event of AUTOMATION_TRIGGER_EVENT_VALUES) {
    const g = getAutomationEventGroup(event);
    result[g].push(event);
  }
  return result;
}
