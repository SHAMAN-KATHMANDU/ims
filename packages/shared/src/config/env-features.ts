/**
 * Environment-based feature flags. Single source of truth for which features
 * are enabled per deployment environment. Plan-based gating remains in features.ts.
 *
 * ## How to add a new feature flag
 * 1. Add a value to the EnvFeature enum below.
 * 2. Set its value in each row of ENV_FEATURE_MATRIX (true/false per env), or rely on
 *    FEATURE_FLAGS env var (comma-separated list of enabled flag names) as an override.
 * 3. If the feature is also plan-gated, add it to the Feature enum and FEATURE_REGISTRY
 *    in features.ts.
 * 4. Frontend: add envFeature to the sidebar nav item; wrap the page with EnvFeaturePageGuard
 *    (and FeaturePageGuard if plan-gated). For inline UI use EnvFeatureGuard.
 * 5. Backend: add enforceEnvFeature(EnvFeature.X) to the route (and enforcePlanFeature
 *    if plan-gated).
 * 6. Rollback: set the flag to false in ENV_FEATURE_MATRIX for that env, or remove it from
 *    FEATURE_FLAGS; redeploy. No code changes required.
 */

export type AppEnv =
  | "development"
  | "staging"
  | "staging-production"
  | "production";

export enum EnvFeature {
  CRM = "CRM",
  CRM_DEALS = "CRM_DEALS",
  CRM_REPORTS = "CRM_REPORTS",
  CRM_SETTINGS = "CRM_SETTINGS",
  CRM_WORKFLOWS = "CRM_WORKFLOWS",
  CRM_PIPELINES_TAB = "CRM_PIPELINES_TAB",
  SALES = "SALES",
  SALES_USER_REPORT = "SALES_USER_REPORT",
  CATALOG = "CATALOG",
  PRODUCTS = "PRODUCTS",
  CATALOG_SETTINGS = "CATALOG_SETTINGS",
  LOCATIONS = "LOCATIONS",
  VENDORS = "VENDORS",
  TRANSFERS = "TRANSFERS",
  DISCOUNTS = "DISCOUNTS",
  PROMOTIONS = "PROMOTIONS",
  PROMO_CODES = "PROMO_CODES",
  BULK_UPLOAD_PRODUCTS = "BULK_UPLOAD_PRODUCTS",
  BULK_UPLOAD_SALES = "BULK_UPLOAD_SALES",
  REPORTS_SALES = "REPORTS_SALES",
  REPORTS_INVENTORY = "REPORTS_INVENTORY",
  REPORTS_CUSTOMERS = "REPORTS_CUSTOMERS",
  REPORTS_TRENDS = "REPORTS_TRENDS",
  REPORTS_FINANCIAL = "REPORTS_FINANCIAL",
  SETTINGS = "SETTINGS",
  USERS_MANAGEMENT = "USERS_MANAGEMENT",
  AUDIT_LOGS = "AUDIT_LOGS",
  API_ACCESS = "API_ACCESS",
  ANALYTICS_ADVANCED = "ANALYTICS_ADVANCED",
  NOTIFICATIONS = "NOTIFICATIONS",
  TASKS = "TASKS",
  SYSTEM_ADMIN = "SYSTEM_ADMIN",
  PASSWORD_RESETS = "PASSWORD_RESETS",
  TRANSFER_REQUEST = "TRANSFER_REQUEST",
  MESSAGING = "MESSAGING",
  MEDIA_UPLOAD = "MEDIA_UPLOAD",
}

/**
 * Default env feature matrix. All flags true in all envs = no behavior change.
 * Can be overridden at runtime by FEATURE_FLAGS env var (comma-separated list of enabled flags).
 */
export const ENV_FEATURE_MATRIX: Record<AppEnv, Record<EnvFeature, boolean>> = {
  development: {
    CRM: true,
    CRM_DEALS: true,
    CRM_REPORTS: true,
    CRM_SETTINGS: true,
    CRM_WORKFLOWS: true,
    CRM_PIPELINES_TAB: true,
    SALES: true,
    SALES_USER_REPORT: true,
    CATALOG: true,
    PRODUCTS: true,
    CATALOG_SETTINGS: true,
    LOCATIONS: true,
    VENDORS: true,
    TRANSFERS: true,
    DISCOUNTS: true,
    PROMOTIONS: true,
    PROMO_CODES: true,
    BULK_UPLOAD_PRODUCTS: true,
    BULK_UPLOAD_SALES: true,
    REPORTS_SALES: true,
    REPORTS_INVENTORY: true,
    REPORTS_CUSTOMERS: true,
    REPORTS_TRENDS: true,
    REPORTS_FINANCIAL: true,
    SETTINGS: true,
    USERS_MANAGEMENT: true,
    AUDIT_LOGS: true,
    API_ACCESS: true,
    ANALYTICS_ADVANCED: true,
    NOTIFICATIONS: true,
    TASKS: true,
    SYSTEM_ADMIN: true,
    PASSWORD_RESETS: true,
    TRANSFER_REQUEST: true,
    MESSAGING: true,
    MEDIA_UPLOAD: true,
  },
  staging: {
    CRM: true,
    CRM_DEALS: true,
    CRM_REPORTS: true,
    CRM_SETTINGS: true,
    CRM_WORKFLOWS: true,
    CRM_PIPELINES_TAB: true,
    SALES: true,
    SALES_USER_REPORT: true,
    CATALOG: true,
    PRODUCTS: true,
    CATALOG_SETTINGS: true,
    LOCATIONS: true,
    VENDORS: true,
    TRANSFERS: true,
    DISCOUNTS: true,
    PROMOTIONS: true,
    PROMO_CODES: true,
    BULK_UPLOAD_PRODUCTS: true,
    BULK_UPLOAD_SALES: true,
    REPORTS_SALES: true,
    REPORTS_INVENTORY: true,
    REPORTS_CUSTOMERS: true,
    REPORTS_TRENDS: true,
    REPORTS_FINANCIAL: true,
    SETTINGS: true,
    USERS_MANAGEMENT: true,
    AUDIT_LOGS: true,
    API_ACCESS: true,
    ANALYTICS_ADVANCED: true,
    NOTIFICATIONS: true,
    TASKS: true,
    SYSTEM_ADMIN: true,
    PASSWORD_RESETS: true,
    TRANSFER_REQUEST: true,
    MESSAGING: true,
    MEDIA_UPLOAD: true,
  },
  "staging-production": {
    CRM: true,
    CRM_DEALS: true,
    CRM_REPORTS: true,
    CRM_SETTINGS: true,
    CRM_WORKFLOWS: true,
    CRM_PIPELINES_TAB: true,
    SALES: true,
    SALES_USER_REPORT: true,
    CATALOG: true,
    PRODUCTS: true,
    CATALOG_SETTINGS: true,
    LOCATIONS: true,
    VENDORS: true,
    TRANSFERS: true,
    DISCOUNTS: true,
    PROMOTIONS: true,
    PROMO_CODES: true,
    BULK_UPLOAD_PRODUCTS: true,
    BULK_UPLOAD_SALES: true,
    REPORTS_SALES: true,
    REPORTS_INVENTORY: true,
    REPORTS_CUSTOMERS: true,
    REPORTS_TRENDS: true,
    REPORTS_FINANCIAL: true,
    SETTINGS: true,
    USERS_MANAGEMENT: true,
    AUDIT_LOGS: true,
    API_ACCESS: true,
    ANALYTICS_ADVANCED: true,
    NOTIFICATIONS: true,
    TASKS: true,
    SYSTEM_ADMIN: true,
    PASSWORD_RESETS: true,
    TRANSFER_REQUEST: true,
    MESSAGING: false,
    MEDIA_UPLOAD: true,
  },
  production: {
    CRM: true,
    CRM_DEALS: false,
    CRM_REPORTS: false,
    CRM_SETTINGS: true,
    CRM_WORKFLOWS: false,
    CRM_PIPELINES_TAB: false,
    SALES: true,
    SALES_USER_REPORT: true,
    CATALOG: true,
    PRODUCTS: true,
    CATALOG_SETTINGS: true,
    LOCATIONS: true,
    VENDORS: true,
    TRANSFERS: true,
    DISCOUNTS: true,
    PROMOTIONS: true,
    PROMO_CODES: true,
    BULK_UPLOAD_PRODUCTS: true,
    BULK_UPLOAD_SALES: true,
    REPORTS_SALES: true,
    REPORTS_INVENTORY: true,
    REPORTS_CUSTOMERS: true,
    REPORTS_TRENDS: true,
    REPORTS_FINANCIAL: true,
    SETTINGS: true,
    USERS_MANAGEMENT: true,
    AUDIT_LOGS: true,
    API_ACCESS: true,
    ANALYTICS_ADVANCED: true,
    NOTIFICATIONS: false,
    TASKS: true,
    SYSTEM_ADMIN: true,
    PASSWORD_RESETS: true,
    TRANSFER_REQUEST: true,
    MESSAGING: false,
    MEDIA_UPLOAD: true,
  },
};

/**
 * Check if an env-based feature is enabled for the given environment.
 * If FEATURE_FLAGS env is set (e.g. "CRM,SALES,PRODUCTS"), only those flags are enabled;
 * otherwise the matrix value for the env is used.
 */
export function isEnvFeatureEnabled(
  flag: EnvFeature,
  env: AppEnv,
  enabledSet?: Set<string>,
): boolean {
  if (enabledSet !== undefined) {
    return enabledSet.has(flag);
  }
  return ENV_FEATURE_MATRIX[env]?.[flag] ?? false;
}

/**
 * Parse FEATURE_FLAGS env var (comma-separated list of enabled flag names).
 * Returns a Set of enabled flag names, or undefined if not set (use matrix).
 */
export function parseFeatureFlagsEnv(
  value: string | undefined,
): Set<string> | undefined {
  if (!value || typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return new Set(
    trimmed
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean),
  );
}
