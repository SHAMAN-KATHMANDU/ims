/**
 * Maps Prisma ResourceType enum to ModuleId for permission authorization.
 * This bridges database resource types to the permission catalog's module grouping.
 *
 * AWAITING confirmation from rbac-schema peer on exact ResourceType enum names.
 */

// Placeholder pending ResourceType enum confirmation from rbac-schema
// Once confirmed, this will be the single source of truth for resource-to-module mapping

export type ResourceType =
  // Workspace
  | "WORKSPACE"
  // Inventory
  | "PRODUCT"
  | "CATEGORY"
  | "VENDOR"
  | "LOCATION"
  | "TRANSFER"
  | "BUNDLE"
  | "GIFT_CARD"
  | "PROMO"
  | "COLLECTION"
  | "ATTRIBUTE_TYPE"
  | "DISCOUNT"
  // Sales
  | "SALE"
  | "WEBSITE_ORDER"
  | "ABANDONED_CART"
  // CRM
  | "CONTACT"
  | "COMPANY"
  | "LEAD"
  | "DEAL"
  | "PIPELINE"
  | "WORKFLOW"
  | "TASK"
  | "ACTIVITY"
  | "AUTOMATION"
  | "REMARKETING_CAMPAIGN"
  | "CONTACT_NOTE"
  // Website
  | "BLOG_POST"
  | "PAGE"
  | "SITE"
  | "MEDIA"
  | "REVIEW"
  | "NAV_MENU"
  // Reports
  | "REPORT"
  | "DASHBOARD"
  | "CUSTOM_REPORT"
  // Settings
  | "USER"
  | "ROLE"
  | "MEMBER"
  | "AUDIT_LOG"
  | "TRASH_ITEM"
  | "AI_SETTING"
  | "WEBHOOK"
  | "API_KEY"
  | "INTEGRATION";

export type ModuleId =
  | "INVENTORY"
  | "SALES"
  | "CRM"
  | "WEBSITE"
  | "REPORTS"
  | "SETTINGS";

export const RESOURCE_TYPE_TO_MODULE: Record<ResourceType, ModuleId> = {
  // Workspace
  WORKSPACE: "SETTINGS",

  // Inventory
  PRODUCT: "INVENTORY",
  CATEGORY: "INVENTORY",
  VENDOR: "INVENTORY",
  LOCATION: "INVENTORY",
  TRANSFER: "INVENTORY",
  BUNDLE: "INVENTORY",
  GIFT_CARD: "INVENTORY",
  PROMO: "INVENTORY",
  COLLECTION: "INVENTORY",
  ATTRIBUTE_TYPE: "INVENTORY",
  DISCOUNT: "INVENTORY",

  // Sales
  SALE: "SALES",
  WEBSITE_ORDER: "SALES",
  ABANDONED_CART: "SALES",

  // CRM
  CONTACT: "CRM",
  COMPANY: "CRM",
  LEAD: "CRM",
  DEAL: "CRM",
  PIPELINE: "CRM",
  WORKFLOW: "CRM",
  TASK: "CRM",
  ACTIVITY: "CRM",
  AUTOMATION: "CRM",
  REMARKETING_CAMPAIGN: "CRM",
  CONTACT_NOTE: "CRM",

  // Website
  BLOG_POST: "WEBSITE",
  PAGE: "WEBSITE",
  SITE: "WEBSITE",
  MEDIA: "WEBSITE",
  REVIEW: "WEBSITE",
  NAV_MENU: "WEBSITE",

  // Reports
  REPORT: "REPORTS",
  DASHBOARD: "REPORTS",
  CUSTOM_REPORT: "REPORTS",

  // Settings
  USER: "SETTINGS",
  ROLE: "SETTINGS",
  MEMBER: "SETTINGS",
  AUDIT_LOG: "SETTINGS",
  TRASH_ITEM: "SETTINGS",
  AI_SETTING: "SETTINGS",
  WEBHOOK: "SETTINGS",
  API_KEY: "SETTINGS",
  INTEGRATION: "SETTINGS",
};
