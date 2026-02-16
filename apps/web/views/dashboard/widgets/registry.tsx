"use client";

/**
 * Widget registry: single source of truth for role -> widgets.
 * Dashboard container reads role once and renders only widgets for that role.
 * No hard-coded role checks inside widget components for visibility.
 */

import type { UserRole } from "@/utils/auth";
import { UserKpiCards } from "./UserKpiCards";
import { UserQuickActions } from "./UserQuickActions";
import { UserSinceLastLogin } from "./UserSinceLastLogin";
import { UserPendingCredit } from "./UserPendingCredit";
import { UserRecentSales } from "./UserRecentSales";
import { UserPersonalTrend } from "./UserPersonalTrend";
import { AdminKpiCards } from "./AdminKpiCards";
import { AdminAlerts } from "./AdminAlerts";
import { AdminLocationSnapshot } from "./AdminLocationSnapshot";
import { AdminInventorySignals } from "./AdminInventorySignals";
import { AdminTransferStatus } from "./AdminTransferStatus";
import { AdminShortcuts } from "./AdminShortcuts";
import { SuperAdminKpiCards } from "./SuperAdminKpiCards";
import { SuperAdminAuditInsights } from "./SuperAdminAuditInsights";
import { SuperAdminRiskIndicators } from "./SuperAdminRiskIndicators";
import { SuperAdminDataIntegrity } from "./SuperAdminDataIntegrity";
import { SuperAdminShortcuts } from "./SuperAdminShortcuts";
import { CrmShortcuts } from "./CrmShortcuts";

export interface DashboardWidgetConfig {
  id: string;
  requiredRoles: readonly UserRole[];
  component: React.ComponentType<{ basePath: string }>;
  dataSource?: string;
  refreshBehavior?: string;
}

const WIDGETS: DashboardWidgetConfig[] = [
  // User role only
  {
    id: "user-kpi-cards",
    requiredRoles: ["user"],
    component: UserKpiCards,
    dataSource: "useDashboardUserSummary",
    refreshBehavior: "staleTime 3min",
  },
  {
    id: "user-quick-actions",
    requiredRoles: ["user"],
    component: UserQuickActions,
    dataSource: "none",
    refreshBehavior: "static",
  },
  {
    id: "user-since-last-login",
    requiredRoles: ["user"],
    component: UserSinceLastLogin,
    dataSource: "useDashboardUserSummary",
    refreshBehavior: "staleTime 3min",
  },
  {
    id: "user-pending-credit",
    requiredRoles: ["user"],
    component: UserPendingCredit,
    dataSource: "useDashboardUserSummary",
    refreshBehavior: "staleTime 3min",
  },
  {
    id: "user-recent-sales",
    requiredRoles: ["user"],
    component: UserRecentSales,
    dataSource: "useDashboardUserSummary",
    refreshBehavior: "staleTime 3min",
  },
  {
    id: "user-personal-trend",
    requiredRoles: ["user"],
    component: UserPersonalTrend,
    dataSource: "useDashboardUserSummary",
    refreshBehavior: "staleTime 3min",
  },
  // Admin and Super Admin
  {
    id: "admin-kpi-cards",
    requiredRoles: ["admin", "superAdmin"],
    component: AdminKpiCards,
    dataSource: "useDashboardAdminSummary",
    refreshBehavior: "staleTime 3min",
  },
  {
    id: "admin-alerts",
    requiredRoles: ["admin", "superAdmin"],
    component: AdminAlerts,
    dataSource: "useDashboardAdminSummary",
    refreshBehavior: "staleTime 3min",
  },
  {
    id: "admin-location-snapshot",
    requiredRoles: ["admin", "superAdmin"],
    component: AdminLocationSnapshot,
    dataSource: "useDashboardAdminSummary",
    refreshBehavior: "staleTime 3min",
  },
  {
    id: "admin-inventory-signals",
    requiredRoles: ["admin", "superAdmin"],
    component: AdminInventorySignals,
    dataSource: "useDashboardAdminSummary",
    refreshBehavior: "staleTime 3min",
  },
  {
    id: "admin-transfer-status",
    requiredRoles: ["admin", "superAdmin"],
    component: AdminTransferStatus,
    dataSource: "useDashboardAdminSummary",
    refreshBehavior: "staleTime 3min",
  },
  {
    id: "admin-shortcuts",
    requiredRoles: ["admin", "superAdmin"],
    component: AdminShortcuts,
    dataSource: "none",
    refreshBehavior: "static",
  },
  {
    id: "crm-shortcuts",
    requiredRoles: ["user", "admin", "superAdmin"],
    component: CrmShortcuts,
    dataSource: "none",
    refreshBehavior: "static",
  },
  // Super Admin only
  {
    id: "superadmin-kpi-cards",
    requiredRoles: ["superAdmin"],
    component: SuperAdminKpiCards,
    dataSource: "useDashboardSuperAdminSummary",
    refreshBehavior: "staleTime 3min",
  },
  {
    id: "superadmin-audit-insights",
    requiredRoles: ["superAdmin"],
    component: SuperAdminAuditInsights,
    dataSource: "useDashboardSuperAdminSummary",
    refreshBehavior: "staleTime 3min",
  },
  {
    id: "superadmin-risk-indicators",
    requiredRoles: ["superAdmin"],
    component: SuperAdminRiskIndicators,
    dataSource: "useDashboardSuperAdminSummary",
    refreshBehavior: "staleTime 3min",
  },
  {
    id: "superadmin-data-integrity",
    requiredRoles: ["superAdmin"],
    component: SuperAdminDataIntegrity,
    dataSource: "useDashboardSuperAdminSummary",
    refreshBehavior: "staleTime 3min",
  },
  {
    id: "superadmin-shortcuts",
    requiredRoles: ["superAdmin"],
    component: SuperAdminShortcuts,
    dataSource: "none",
    refreshBehavior: "static",
  },
];

/**
 * Returns widgets to render for the given role, in display order.
 * Visibility is determined here only; widgets do not check role.
 */
export function getWidgetsForRole(
  role: UserRole | null,
): DashboardWidgetConfig[] {
  if (!role) return [];
  return WIDGETS.filter((w) => w.requiredRoles.includes(role));
}
