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
  KeyRound,
  Zap,
} from "lucide-react";
import type { UserRole } from "@/utils/auth";
import {
  Feature,
  EnvFeature,
  isEnvFeatureEnabled,
  parseFeatureFlagsEnv,
} from "@repo/shared";
import type { AppEnv } from "@repo/shared";

export interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  envFeature?: EnvFeature;
  feature?: Feature;
  children?: NavItem[];
  href?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export type NavItemWithHref = NavItem & { href: string };

export const dashboardNavSections: NavSection[] = [
  {
    title: "PLATFORM",
    items: [
      { path: "", label: "Dashboard", icon: Home, roles: ["platformAdmin"] },
      {
        path: "platform/tenants",
        label: "Tenants",
        icon: ShieldCheck,
        roles: ["platformAdmin"],
      },
      {
        path: "platform/plan-limits",
        label: "Plan limits",
        icon: SlidersHorizontal,
        roles: ["platformAdmin"],
      },
      {
        path: "platform/trash",
        label: "Trash",
        icon: Trash2,
        roles: ["platformAdmin"],
      },
      {
        path: "settings/error-reports",
        label: "Error Reports",
        icon: Bug,
        roles: ["platformAdmin"],
      },
      {
        path: "platform/password-resets",
        label: "Password Resets",
        icon: KeyRound,
        roles: ["platformAdmin"],
      },
    ],
  },
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
      },
      {
        path: "crm/companies",
        label: "Companies",
        icon: Factory,
        roles: ["user", "admin", "superAdmin"],
        envFeature: EnvFeature.CRM,
        feature: Feature.SALES_PIPELINE,
      },
      {
        path: "crm/contacts",
        label: "Contacts",
        icon: Contact,
        roles: ["user", "admin", "superAdmin"],
        envFeature: EnvFeature.CRM,
        feature: Feature.SALES_PIPELINE,
      },
      {
        path: "crm/deals",
        label: "Deals",
        icon: Handshake,
        roles: ["user", "admin", "superAdmin"],
        envFeature: EnvFeature.CRM_DEALS,
        feature: Feature.SALES_PIPELINE,
      },
      {
        path: "crm/tasks",
        label: "Tasks",
        icon: CheckSquare,
        roles: ["user", "admin", "superAdmin"],
        envFeature: EnvFeature.TASKS,
        feature: Feature.SALES_PIPELINE,
      },
      {
        path: "crm/notifications",
        label: "Notifications",
        icon: Bell,
        roles: ["user", "admin", "superAdmin"],
        envFeature: EnvFeature.NOTIFICATIONS,
        feature: Feature.SALES_PIPELINE,
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
      },
      {
        path: "sales/user-report",
        label: "User Sales Report",
        icon: ListChecks,
        roles: ["user", "admin", "superAdmin"],
        envFeature: EnvFeature.SALES_USER_REPORT,
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
      },
      {
        path: "products/promos",
        label: "Promo Codes",
        icon: Ticket,
        roles: ["user", "admin", "superAdmin"],
        envFeature: EnvFeature.PROMO_CODES,
        feature: Feature.PROMO_MANAGEMENT,
      },
      {
        path: "transfers/new",
        label: "Create Transfer Request",
        icon: ArrowLeftRight,
        roles: ["user", "admin", "superAdmin"],
        envFeature: EnvFeature.TRANSFER_REQUEST,
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
      },
      {
        path: "products/catalog-settings",
        label: "Catalog Settings",
        icon: Layers,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.CATALOG_SETTINGS,
      },
      {
        path: "locations",
        label: "Locations",
        icon: Warehouse,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.LOCATIONS,
      },
      {
        path: "vendors",
        label: "Vendors",
        icon: Truck,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.VENDORS,
      },
      {
        path: "transfers",
        label: "Transfers",
        icon: PackageCheck,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.TRANSFERS,
      },
      {
        path: "products/discounts",
        label: "Discounts",
        icon: Percent,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.DISCOUNTS,
      },
      {
        path: "promos",
        label: "Promotions",
        icon: Ticket,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.PROMOTIONS,
        feature: Feature.PROMO_MANAGEMENT,
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
      },
      {
        path: "reports/analytics/inventory",
        label: "Inventory & Operations",
        icon: Package,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.REPORTS_INVENTORY,
        feature: Feature.ANALYTICS_ADVANCED,
      },
      {
        path: "reports/analytics/customers",
        label: "Customers & Promotions",
        icon: Users,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.REPORTS_CUSTOMERS,
        feature: Feature.ANALYTICS_ADVANCED,
      },
      {
        path: "reports/analytics/trends",
        label: "Trends",
        icon: LineChart,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.REPORTS_TRENDS,
        feature: Feature.ANALYTICS_ADVANCED,
      },
      {
        path: "reports/analytics/financial",
        label: "Financial",
        icon: DollarSign,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.REPORTS_FINANCIAL,
        feature: Feature.ANALYTICS_ADVANCED,
      },
      {
        path: "reports/crm",
        label: "CRM Reports",
        icon: PieChart,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.CRM_REPORTS,
        feature: Feature.ANALYTICS_ADVANCED,
      },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      {
        path: "settings",
        label: "Settings",
        icon: UserCog,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.SETTINGS,
      },
      {
        path: "settings/crm",
        label: "CRM Settings",
        icon: SlidersHorizontal,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.CRM_SETTINGS,
        feature: Feature.SALES_PIPELINE,
      },
      {
        path: "settings/automation",
        label: "Automation",
        icon: Zap,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.AUTOMATION,
      },
      {
        path: "settings/crm/workflows",
        label: "Workflows",
        icon: Zap,
        roles: ["admin", "superAdmin"],
        envFeature: EnvFeature.CRM_WORKFLOWS,
        feature: Feature.SALES_PIPELINE,
      },
      {
        path: "users",
        label: "Users",
        icon: Users,
        roles: ["superAdmin"],
        envFeature: EnvFeature.USERS_MANAGEMENT,
      },
      {
        path: "settings/logs",
        label: "User Logs",
        icon: FileText,
        roles: ["superAdmin"],
        envFeature: EnvFeature.AUDIT_LOGS,
        feature: Feature.AUDIT_LOGS,
      },
      {
        path: "settings/password-reset",
        label: "Password Reset Requests",
        icon: KeyRound,
        roles: ["superAdmin"],
        envFeature: EnvFeature.PASSWORD_RESETS,
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
  }: FilterDashboardNavOptions,
): Array<{ title: string; items: NavItemWithHref[] }> {
  if (!userRole) return [];
  return sections
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) => item.roles.includes(userRole))
        .filter(
          (item) =>
            !item.envFeature ||
            isEnvFeatureEnabled(item.envFeature, appEnv, enabledEnvFlagsSet),
        )
        .filter((item) => !item.feature || planFeatures[item.feature] === true)
        .map((item) => ({
          ...item,
          href: `${basePath}${item.path ? `/${item.path}` : ""}`,
        })),
    }))
    .filter((section) => section.items.length > 0);
}
