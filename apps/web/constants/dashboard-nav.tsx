import type React from "react";
import {
  Home,
  Package,
  MessageSquare,
  Warehouse,
  ArrowLeftRight,
  UserCog,
  Users,
  Receipt,
  Factory,
  Percent,
  Layers,
  Bug,
  ShieldCheck,
  LayoutDashboard,
  Contact,
  Handshake,
  CheckSquare,
  Bell,
  Trash2,
  FileText,
  Ticket,
  Boxes,
  TrendingUp,
  LineChart,
  DollarSign,
  PieChart,
  SlidersHorizontal,
  Truck,
  PackageCheck,
  ListChecks,
  ShoppingBag,
  KeyRound,
  Zap,
  GitBranch,
  LayoutGrid,
  BrainCircuit,
  PenSquare,
} from "lucide-react";
import type { UserRole } from "@/utils/auth";
import {
  Feature,
  EnvFeature,
  isEnvFeatureEnabled,
  parseFeatureFlagsEnv,
  type ModuleId,
} from "@repo/shared";
import type { AppEnv } from "@repo/shared";

/**
 * Per-tenant feature flags that gate sidebar visibility. Currently only
 * `websiteEnabled` — flipped by platform admins per tenant. Extending this
 * map is the preferred path for new tenant-level nav gates.
 */
export type TenantFeatureKey = "websiteEnabled";

export interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  envFeature?: EnvFeature;
  /** When set, the item is shown if any of these env features is enabled (ignores `envFeature`). */
  envFeaturesAny?: EnvFeature[];
  feature?: Feature;
  /** Per-tenant feature flag gate. Hides the item when the flag is false. */
  tenantFeature?: TenantFeatureKey;
  /**
   * RBAC module gate. When set, the item is hidden if the current user has no
   * VIEW permission in this module. Applied on top of env/plan/role gates so
   * all must pass for the item to be visible.
   *
   * Items without a `permModule` are always shown (no RBAC check).
   */
  permModule?: ModuleId;
  children?: NavItem[];
  href?: string;
  /** When true the link opens in a new browser tab. */
  openInNewTab?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export type NavItemWithHref = NavItem & { href: string };

export const dashboardNavSections: NavSection[] = [
  // PLATFORM section removed: platformAdmin users now live in the dedicated
  // `(platform)` console at /[workspace]/platform/* with its own thin shell
  // (see apps/web/components/layout/platform-shell.tsx). PlatformAdminRedirect
  // pushes them out of this dashboard before any tenant-scoped hook fires.
  {
    title: "MAIN",
    items: [
      {
        path: "",
        label: "Dashboard",
        icon: Home,
        roles: ["user", "admin", "superAdmin"],
      },
    ],
  },
  {
    title: "CRM",
    items: [
      {
        path: "crm",
        label: "Overview",
        icon: LayoutDashboard,
        roles: ["user", "admin", "superAdmin"],
        envFeature: EnvFeature.CRM,
        feature: Feature.SALES_PIPELINE,
        permModule: "CRM" as const,
      },
      {
        path: "crm/companies",
        label: "Companies",
        icon: Factory,
        roles: ["user", "admin", "superAdmin"],
        envFeature: EnvFeature.CRM,
        feature: Feature.SALES_PIPELINE,
        permModule: "CRM" as const,
      },
      {
        path: "crm/contacts",
        label: "Contacts",
        icon: Contact,
        roles: ["user", "admin", "superAdmin"],
        envFeature: EnvFeature.CRM,
        feature: Feature.SALES_PIPELINE,
        permModule: "CRM" as const,
      },
      {
        path: "crm/deals",
        label: "Deals",
        icon: Handshake,
        roles: ["user", "admin", "superAdmin"],
        envFeature: EnvFeature.CRM_DEALS,
        feature: Feature.SALES_PIPELINE,
        permModule: "CRM" as const,
      },
      {
        path: "crm/tasks",
        label: "Tasks",
        icon: CheckSquare,
        roles: ["user", "admin", "superAdmin"],
        envFeature: EnvFeature.TASKS,
        feature: Feature.SALES_PIPELINE,
        permModule: "CRM" as const,
      },
      {
        path: "crm/notifications",
        label: "Notifications",
        icon: Bell,
        roles: ["user", "admin", "superAdmin"],
        envFeature: EnvFeature.NOTIFICATIONS,
        feature: Feature.SALES_PIPELINE,
        // No permModule: notifications are not RBAC-gated
      },
    ],
  },
  {
    title: "MESSAGING",
    items: [
      {
        path: "messaging",
        label: "Inbox",
        icon: MessageSquare,
        roles: ["user", "admin", "superAdmin"],
        feature: Feature.MESSAGING,
        envFeature: EnvFeature.MESSAGING,
      },
    ],
  },
  {
    title: "SALES",
    items: [
      {
        path: "sales",
        label: "Sales",
        icon: Receipt,
        roles: ["user", "admin", "superAdmin"],
        envFeature: EnvFeature.SALES,
        permModule: "SALES" as const,
      },
      {
        path: "sales/user-report",
        label: "User Sales Report",
        icon: ListChecks,
        roles: ["user", "admin", "superAdmin"],
        envFeature: EnvFeature.SALES_USER_REPORT,
        permModule: "SALES" as const,
      },
      {
        path: "sales/website-orders",
        label: "Website Orders",
        icon: ShoppingBag,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.TENANT_WEBSITES,
        tenantFeature: "websiteEnabled",
        permModule: "SALES" as const,
      },
    ],
  },
  {
    title: "PRODUCTS",
    items: [
      {
        path: "products/catalog",
        label: "Catalog",
        icon: Package,
        roles: ["user", "admin", "superAdmin"],
        envFeature: EnvFeature.CATALOG,
        permModule: "INVENTORY" as const,
      },
      {
        path: "products/promos",
        label: "Promo Codes",
        icon: Ticket,
        roles: ["user", "admin", "superAdmin"],
        envFeature: EnvFeature.PROMO_CODES,
        feature: Feature.PROMO_MANAGEMENT,
        permModule: "INVENTORY" as const,
      },
      {
        path: "transfers/new",
        label: "Create Transfer Request",
        icon: ArrowLeftRight,
        roles: ["user", "admin", "superAdmin"],
        envFeature: EnvFeature.TRANSFER_REQUEST,
        permModule: "INVENTORY" as const,
      },
    ],
  },
  {
    title: "INVENTORY",
    items: [
      {
        path: "products",
        label: "Products",
        icon: Boxes,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.PRODUCTS,
        permModule: "INVENTORY" as const,
      },
      {
        path: "products/catalog-settings",
        label: "Catalog Settings",
        icon: Layers,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.CATALOG_SETTINGS,
        permModule: "INVENTORY" as const,
      },
      {
        path: "locations",
        label: "Locations",
        icon: Warehouse,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.LOCATIONS,
        permModule: "INVENTORY" as const,
      },
      {
        path: "vendors",
        label: "Vendors",
        icon: Truck,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.VENDORS,
        permModule: "INVENTORY" as const,
      },
      {
        path: "transfers",
        label: "Transfers",
        icon: PackageCheck,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.TRANSFERS,
        permModule: "INVENTORY" as const,
      },
      {
        path: "products/discounts",
        label: "Discounts",
        icon: Percent,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.DISCOUNTS,
        permModule: "INVENTORY" as const,
      },
      {
        path: "promos",
        label: "Promotions",
        icon: Ticket,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.PROMOTIONS,
        feature: Feature.PROMO_MANAGEMENT,
        permModule: "INVENTORY" as const,
      },
    ],
  },
  {
    title: "REPORTS",
    items: [
      {
        path: "reports/analytics/sales",
        label: "Sales & Revenue",
        icon: TrendingUp,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.REPORTS_SALES,
        feature: Feature.ANALYTICS_ADVANCED,
        permModule: "REPORTS" as const,
      },
      {
        path: "reports/analytics/inventory",
        label: "Inventory & Operations",
        icon: Package,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.REPORTS_INVENTORY,
        feature: Feature.ANALYTICS_ADVANCED,
        permModule: "REPORTS" as const,
      },
      {
        path: "reports/analytics/customers",
        label: "Customers & Promotions",
        icon: Users,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.REPORTS_CUSTOMERS,
        feature: Feature.ANALYTICS_ADVANCED,
        permModule: "REPORTS" as const,
      },
      {
        path: "reports/analytics/trends",
        label: "Trends",
        icon: LineChart,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.REPORTS_TRENDS,
        feature: Feature.ANALYTICS_ADVANCED,
        permModule: "REPORTS" as const,
      },
      {
        path: "reports/analytics/financial",
        label: "Financial",
        icon: DollarSign,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.REPORTS_FINANCIAL,
        feature: Feature.ANALYTICS_ADVANCED,
        permModule: "REPORTS" as const,
      },
      {
        path: "reports/crm",
        label: "CRM Reports",
        icon: PieChart,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.CRM_REPORTS,
        feature: Feature.ANALYTICS_ADVANCED,
        permModule: "REPORTS" as const,
      },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      // Single Settings entry — every workspace settings sub-area (CRM,
      // Automations, AI, Roles & permissions, Users, User logs, Password
      // resets, Website) lives under the in-page sub-nav rendered by
      // apps/web/app/[workspace]/(admin)/settings/layout.tsx, driven by
      // SETTINGS_SECTIONS in apps/web/features/settings/config/sections.ts.
      // Removing the per-area sidebar links keeps the dashboard sidebar
      // tight and routes admins through one Settings hub.
      {
        path: "settings",
        label: "Settings",
        icon: UserCog,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.SETTINGS,
        permModule: "SETTINGS" as const,
      },
      {
        path: "site-editor",
        label: "Website Designer",
        icon: PenSquare,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.TENANT_WEBSITES,
        tenantFeature: "websiteEnabled",
        openInNewTab: true,
        permModule: "WEBSITE" as const,
      },
    ],
  },
];

export interface FilterDashboardNavOptions {
  userRole: UserRole | null | undefined;
  basePath: string;
  planFeatures: Record<Feature, boolean>;
  appEnv: AppEnv;
  enabledEnvFlagsSet: ReturnType<typeof parseFeatureFlagsEnv>;
  /**
   * Per-tenant feature flags. Missing entries are treated as false so
   * tenant-gated items are hidden by default — the platform admin must
   * opt in explicitly.
   */
  tenantFeatures?: Partial<Record<TenantFeatureKey, boolean>>;
  /**
   * RBAC module access map (from `useModuleAccessMap()`).
   * When provided, items with `permModule` set are only shown if the
   * corresponding module value is `true`. `undefined` map = allow all
   * (backward compatible: sidebar without RBAC still works).
   */
  moduleAccess?: Partial<Record<ModuleId, boolean>>;
}

/** Same visibility rules as the sidebar — single source for nav + command palette. */
export function filterDashboardNavSections(
  sections: NavSection[],
  {
    userRole,
    basePath,
    planFeatures,
    appEnv,
    enabledEnvFlagsSet,
    tenantFeatures,
    moduleAccess,
  }: FilterDashboardNavOptions,
): Array<{ title: string; items: NavItemWithHref[] }> {
  if (!userRole) return [];
  return sections
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) => item.roles.includes(userRole))
        .filter((item) => {
          if (item.envFeaturesAny && item.envFeaturesAny.length > 0) {
            return item.envFeaturesAny.some((f) =>
              isEnvFeatureEnabled(f, appEnv, enabledEnvFlagsSet),
            );
          }
          return (
            !item.envFeature ||
            isEnvFeatureEnabled(item.envFeature, appEnv, enabledEnvFlagsSet)
          );
        })
        .filter((item) => !item.feature || planFeatures[item.feature] === true)
        .filter((item) => {
          if (!item.tenantFeature) return true;
          return tenantFeatures?.[item.tenantFeature] === true;
        })
        .filter((item) => {
          // RBAC module gate: only applied when moduleAccess is provided.
          // Missing map = allow (backward compatible; also allows during loading).
          if (!item.permModule || !moduleAccess) return true;
          // undefined in the map means "not yet computed" → allow (fail-open).
          const access = moduleAccess[item.permModule];
          return access !== false;
        })
        .map((item) => ({
          ...item,
          href: `${basePath}${item.path ? `/${item.path}` : ""}`,
        })),
    }))
    .filter((section) => section.items.length > 0);
}
