/**
 * Feature Registry — Single source of truth for plan-gated features.
 *
 * Used by both backend (middleware enforcement) and frontend (UI gating).
 *
 * To add a new gated feature:
 *   1. Add it to the Feature enum
 *   2. Add its definition to FEATURE_REGISTRY
 *   3. Wrap the backend route with enforcePlanLimits middleware
 *   4. Wrap the frontend UI with <FeatureGuard feature={Feature.XXX}>
 */

export enum PlanTier {
  STARTER = "STARTER",
  PROFESSIONAL = "PROFESSIONAL",
  ENTERPRISE = "ENTERPRISE",
}

export enum Feature {
  // Product features
  BULK_UPLOAD_PRODUCTS = "BULK_UPLOAD_PRODUCTS",
  BULK_UPLOAD_SALES = "BULK_UPLOAD_SALES",

  // Analytics & reporting
  ANALYTICS_BASIC = "ANALYTICS_BASIC",
  ANALYTICS_ADVANCED = "ANALYTICS_ADVANCED",

  // Promo management
  PROMO_MANAGEMENT = "PROMO_MANAGEMENT",

  // Audit & compliance
  AUDIT_LOGS = "AUDIT_LOGS",

  // Integration
  API_ACCESS = "API_ACCESS",

  // Team management
  MULTIPLE_LOCATIONS = "MULTIPLE_LOCATIONS",
}

export interface FeatureDefinition {
  label: string;
  description: string;
  minimumPlan: PlanTier;
  upgradeMessage: string;
}

/**
 * Registry of all plan-gated features with their minimum plan requirements.
 */
export const FEATURE_REGISTRY: Record<Feature, FeatureDefinition> = {
  [Feature.BULK_UPLOAD_PRODUCTS]: {
    label: "Bulk Upload Products",
    description: "Import products from CSV/Excel files",
    minimumPlan: PlanTier.PROFESSIONAL,
    upgradeMessage:
      "Upgrade to Professional to bulk import products from spreadsheets.",
  },
  [Feature.BULK_UPLOAD_SALES]: {
    label: "Bulk Upload Sales",
    description: "Import sales records from CSV/Excel files",
    minimumPlan: PlanTier.PROFESSIONAL,
    upgradeMessage:
      "Upgrade to Professional to bulk import sales from spreadsheets.",
  },
  [Feature.ANALYTICS_BASIC]: {
    label: "Basic Analytics",
    description: "Dashboard with basic sales and inventory metrics",
    minimumPlan: PlanTier.STARTER,
    upgradeMessage: "", // Available on all plans
  },
  [Feature.ANALYTICS_ADVANCED]: {
    label: "Advanced Analytics",
    description: "Detailed reports, trends, and export capabilities",
    minimumPlan: PlanTier.PROFESSIONAL,
    upgradeMessage:
      "Upgrade to Professional for advanced analytics and reporting.",
  },
  [Feature.PROMO_MANAGEMENT]: {
    label: "Promo Code Management",
    description: "Create and manage promotional codes and discounts",
    minimumPlan: PlanTier.PROFESSIONAL,
    upgradeMessage:
      "Upgrade to Professional to create and manage promotional codes.",
  },
  [Feature.AUDIT_LOGS]: {
    label: "Audit Logs",
    description: "View detailed activity logs for compliance and security",
    minimumPlan: PlanTier.ENTERPRISE,
    upgradeMessage: "Upgrade to Enterprise for full audit log access.",
  },
  [Feature.API_ACCESS]: {
    label: "API Access",
    description: "Programmatic access to your data via REST API",
    minimumPlan: PlanTier.ENTERPRISE,
    upgradeMessage: "Upgrade to Enterprise for API access.",
  },
  [Feature.MULTIPLE_LOCATIONS]: {
    label: "Multiple Locations",
    description: "Manage inventory across multiple warehouses and showrooms",
    minimumPlan: PlanTier.STARTER,
    upgradeMessage: "", // Available on all plans (with location count limits)
  },
};

/**
 * Plan hierarchy for comparison.
 */
const PLAN_HIERARCHY: Record<PlanTier, number> = {
  [PlanTier.STARTER]: 0,
  [PlanTier.PROFESSIONAL]: 1,
  [PlanTier.ENTERPRISE]: 2,
};

/**
 * Check if a plan is sufficient for a feature.
 */
export function isPlanSufficient(
  currentPlan: PlanTier,
  requiredPlan: PlanTier,
): boolean {
  return PLAN_HIERARCHY[currentPlan] >= PLAN_HIERARCHY[requiredPlan];
}

/**
 * Check if a specific feature is available on the given plan.
 */
export function isFeatureAvailable(
  feature: Feature,
  currentPlan: PlanTier,
): boolean {
  const definition = FEATURE_REGISTRY[feature];
  if (!definition) return false;
  return isPlanSufficient(currentPlan, definition.minimumPlan);
}

/**
 * Get all features available on a given plan.
 */
export function getAvailableFeatures(plan: PlanTier): Feature[] {
  return Object.entries(FEATURE_REGISTRY)
    .filter(([, def]) => isPlanSufficient(plan, def.minimumPlan))
    .map(([feature]) => feature as Feature);
}

/**
 * Resource usage limits by plan tier.
 */
export interface PlanLimits {
  maxUsers: number; // -1 = unlimited
  maxProducts: number;
  maxLocations: number;
  maxMembers: number;
  bulkUpload: boolean;
  analytics: boolean;
  promoManagement: boolean;
  auditLogs: boolean;
  apiAccess: boolean;
}

/**
 * Default plan limits (should match seed data in PlanLimit table).
 * Used as a fallback if the database is unavailable.
 */
export const DEFAULT_PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  [PlanTier.STARTER]: {
    maxUsers: 3,
    maxProducts: 100,
    maxLocations: 2,
    maxMembers: 500,
    bulkUpload: false,
    analytics: false,
    promoManagement: false,
    auditLogs: false,
    apiAccess: false,
  },
  [PlanTier.PROFESSIONAL]: {
    maxUsers: 10,
    maxProducts: 1000,
    maxLocations: 10,
    maxMembers: 5000,
    bulkUpload: true,
    analytics: true,
    promoManagement: true,
    auditLogs: false,
    apiAccess: false,
  },
  [PlanTier.ENTERPRISE]: {
    maxUsers: -1,
    maxProducts: -1,
    maxLocations: -1,
    maxMembers: -1,
    bulkUpload: true,
    analytics: true,
    promoManagement: true,
    auditLogs: true,
    apiAccess: true,
  },
};
