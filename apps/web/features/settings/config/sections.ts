/**
 * SETTINGS_SECTIONS registry — single source of truth for every settings section.
 *
 * Used by SettingsLayout to build the filtered side-nav. Each entry maps to an
 * existing page route; no files are moved — guards on each page remain authoritative.
 *
 * Filtering rules (applied in SettingsLayout):
 *   - roles       → hide if the current user's role is not in the list
 *   - envFeature  → hide if the env-based feature flag is disabled
 *   - feature     → hide if the plan-gated feature is not available on this tenant's plan
 */

import type { UserRole } from "@/utils/auth";
import { Feature, EnvFeature } from "@repo/shared";

export interface SettingsSection {
  /** Stable key — used for React keys and active-link comparison. */
  id: string;
  /** Sidebar label. */
  label: string;
  /** Optional sub-label shown below the primary label. */
  description?: string;
  /**
   * Relative path under `/{workspace}/` — e.g. `"settings/ai"`.
   * Built into a full href as `/${workspace}/${path}`.
   */
  path: string;
  /** Rendered under the "Workspace" or "Platform" subheading. */
  group: "workspace" | "platform";
  /** Which roles may see this entry. */
  roles: UserRole[];
  /**
   * Plan-gated feature. Hide entry when the tenant's plan does not include this.
   * platformAdmin bypasses plan checks (always visible).
   */
  feature?: Feature;
  /**
   * Env-based feature flag. Hide entry when the flag is disabled for the current env.
   * Mirrors the EnvFeaturePageGuard used on the target page.
   */
  envFeature?: EnvFeature;
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  // ── Workspace group ────────────────────────────────────────────────────────
  // General — no env/plan gate; AuthGuard(admin|superAdmin) on the page.
  {
    id: "general",
    label: "General",
    description: "Account, password and payment methods",
    path: "settings",
    group: "workspace",
    roles: ["admin", "superAdmin"],
  },
  // Roles & permissions — scoped-RBAC role editor + member assignment.
  // Page enforces SETTINGS.ROLES.MANAGE via PermissionGate.
  {
    id: "roles",
    label: "Roles & permissions",
    description: "Custom roles, permission grants and overwrites",
    path: "settings/roles",
    group: "workspace",
    roles: ["admin", "superAdmin"],
  },
  // Users — workspace user management. Lives at /[workspace]/users today;
  // surfaced from the settings nav so admins find it under one Settings.
  {
    id: "users",
    label: "Users",
    description: "Invite, edit and manage workspace members",
    path: "settings/users",
    group: "workspace",
    roles: ["admin", "superAdmin"],
    envFeature: EnvFeature.USERS_MANAGEMENT,
  },
  // AI — no env/plan gate; AuthGuard(admin|superAdmin) on the page.
  {
    id: "ai",
    label: "AI",
    description: "AI assistant configuration",
    path: "settings/ai",
    group: "workspace",
    roles: ["admin", "superAdmin"],
  },
  // Automations hub — canonical plural form; /settings/automation redirects here.
  // EnvFeature.SETTINGS mirrors the page's EnvFeaturePageGuard.
  {
    id: "automations",
    label: "Automations",
    description: "Event automations and deal pipeline rules",
    path: "settings/automations",
    group: "workspace",
    roles: ["admin", "superAdmin"],
    envFeature: EnvFeature.SETTINGS,
  },
  // CRM settings — requires CRM_SETTINGS env flag AND SALES_PIPELINE plan.
  {
    id: "crm",
    label: "CRM",
    description: "Pipelines, sources, journey types and tags",
    path: "settings/crm",
    group: "workspace",
    roles: ["admin", "superAdmin"],
    envFeature: EnvFeature.CRM_SETTINGS,
    feature: Feature.SALES_PIPELINE,
  },
  // CRM workflows — requires CRM_WORKFLOWS env flag AND SALES_PIPELINE plan.
  {
    id: "crm-workflows",
    label: "CRM workflows",
    description: "Deal pipeline automation rules",
    path: "settings/crm/workflows",
    group: "workspace",
    roles: ["admin", "superAdmin"],
    envFeature: EnvFeature.CRM_WORKFLOWS,
    feature: Feature.SALES_PIPELINE,
  },
  // Website moved out of Settings into the top-level MARKETING sidebar
  // section (apps/web/constants/dashboard-nav.tsx) — it now opens as its
  // own page (the site-editor) rather than nesting inside settings.
  // /settings/site/* routes still resolve for direct links / bookmarks.

  // ── Platform group (superAdmin / platformAdmin only) ───────────────────────
  // User logs — superAdmin only; requires AUDIT_LOGS env flag AND AUDIT_LOGS plan feature.
  // Page lives under (superadmin)/settings/logs — URL stays unchanged.
  {
    id: "logs",
    label: "User logs",
    description: "Audit log for all workspace activity",
    path: "settings/logs",
    group: "platform",
    roles: ["superAdmin"],
    envFeature: EnvFeature.AUDIT_LOGS,
    feature: Feature.AUDIT_LOGS,
  },
  // Error reports — platformAdmin only; no env/plan gate on the page.
  {
    id: "error-reports",
    label: "Error reports",
    description: "View and triage reported errors",
    path: "settings/error-reports",
    group: "platform",
    roles: ["platformAdmin"],
  },
  // Password resets — superAdmin only; no env/plan gate on the page.
  {
    id: "password-reset",
    label: "Password resets",
    description: "Review and approve password reset requests",
    path: "settings/password-reset",
    group: "platform",
    roles: ["superAdmin"],
  },
];
