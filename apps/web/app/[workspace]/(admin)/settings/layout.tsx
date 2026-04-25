"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { isEnvFeatureEnabled, parseFeatureFlagsEnv } from "@repo/shared";
import { useAuthStore, selectUserRole } from "@/store/auth-store";
import { usePlanFeatures } from "@/features/flags";
import { getAppEnv, featureFlagsEnv } from "@/config/env";
import {
  SETTINGS_SECTIONS,
  type SettingsSection,
} from "@/features/settings/config/sections";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/utils/auth";

// ── Constants ──────────────────────────────────────────────────────────────────

const GROUPS = ["workspace", "platform"] as const;
type Group = (typeof GROUPS)[number];

const GROUP_LABELS: Record<Group, string> = {
  workspace: "Workspace",
  platform: "Platform",
};

/**
 * Parsed FEATURE_FLAGS env var. Computed once at module load (same pattern as sidebar.tsx).
 * Undefined means "use the default ENV_FEATURE_MATRIX".
 */
const enabledEnvFlagsSet =
  typeof featureFlagsEnv !== "undefined"
    ? parseFeatureFlagsEnv(featureFlagsEnv)
    : undefined;

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Compute the single best-matching active href for the current pathname:
 * the longest section href that is either an exact match or a strict prefix
 * (with a `/` boundary). This avoids parent + child both lighting up at
 * once — e.g. on /settings/crm/workflows only the CRM workflows item is
 * active, not the CRM Settings item.
 *
 * The root "general" section (href = /workspace/settings) is special-cased
 * to exact match only, so it doesn't claim every /settings/* descendant.
 */
function pickActiveHref(
  hrefs: Array<{ id: string; href: string }>,
  pathname: string,
): string | null {
  let best: { id: string; href: string } | null = null;
  for (const item of hrefs) {
    const exact = pathname === item.href;
    const isGeneral = item.id === "general";
    const matches =
      exact || (!isGeneral && pathname.startsWith(item.href + "/"));
    if (!matches) continue;
    if (!best || item.href.length > best.href.length) best = item;
  }
  return best?.href ?? null;
}

// ── Layout component ───────────────────────────────────────────────────────────

/**
 * Settings layout — two-pane shell for all admin settings pages.
 *
 * Left rail: filtered, role/feature-aware nav grouped into "Workspace" and "Platform".
 * Right pane: {children} (the individual settings pages rendered unchanged).
 *
 * Notes:
 * - Lives under (admin), so it inherits the group-level AuthGuard.
 * - Platform sections (logs, error-reports, password-reset) live under (superadmin)
 *   and are only *linked* from here — their per-page AuthGuards remain authoritative.
 * - Does not add new auth checks; per-page guards remain the source of truth.
 */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  const params = useParams() as { workspace?: string };
  const workspace = params.workspace ?? "";
  const pathname = usePathname();
  const userRole = useAuthStore(selectUserRole);
  const planFeatures = usePlanFeatures();
  const appEnv = getAppEnv();

  // ── Filter sections ──────────────────────────────────────────────────────────
  const visibleSections = useMemo(() => {
    return SETTINGS_SECTIONS.filter((section: SettingsSection) => {
      // 1. Role check — hide if current role is not permitted
      if (userRole && !section.roles.includes(userRole as UserRole))
        return false;

      // 2. Env feature check — hide if the env flag is disabled
      if (
        section.envFeature !== undefined &&
        !isEnvFeatureEnabled(section.envFeature, appEnv, enabledEnvFlagsSet)
      ) {
        return false;
      }

      // 3. Plan feature check — hide if tenant's plan doesn't include the feature
      //    platformAdmin bypasses plan checks (handled inside usePlanFeatures).
      if (section.feature !== undefined && !planFeatures[section.feature]) {
        return false;
      }

      return true;
    });
  }, [userRole, appEnv, planFeatures]);

  // ── Group sections ───────────────────────────────────────────────────────────
  const sectionsByGroup = useMemo(() => {
    const map = new Map<Group, SettingsSection[]>(GROUPS.map((g) => [g, []]));
    for (const section of visibleSections) {
      map.get(section.group)!.push(section);
    }
    return map;
  }, [visibleSections]);

  // Compute the single best-matching active href across every visible
  // section so parent + child don't both light up (e.g. settings/crm vs
  // settings/crm/workflows). Reused via lookup below.
  const activeHref = useMemo(
    () =>
      pickActiveHref(
        visibleSections.map((s) => ({
          id: s.id,
          href: `/${workspace}/${s.path}`,
        })),
        pathname,
      ),
    [visibleSections, workspace, pathname],
  );

  return (
    <div className="flex gap-8">
      {/* ── Left nav rail ───────────────────────────────────────────────── */}
      <nav aria-label="Settings" className="w-48 shrink-0 space-y-6">
        {GROUPS.map((group) => {
          const items = sectionsByGroup.get(group) ?? [];
          if (items.length === 0) return null;

          return (
            <div key={group}>
              <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {GROUP_LABELS[group]}
              </p>
              <ul role="list" className="space-y-0.5">
                {items.map((section) => {
                  const href = `/${workspace}/${section.path}`;
                  const active = href === activeHref;

                  return (
                    <li key={section.id}>
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "block rounded-md px-2 py-1.5 text-sm transition-colors",
                          active
                            ? "bg-accent text-accent-foreground font-medium"
                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                        )}
                      >
                        {section.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* ── Main content pane ───────────────────────────────────────────── */}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
