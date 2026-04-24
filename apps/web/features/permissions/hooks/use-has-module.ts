"use client";

/**
 * Module-level permission hooks.
 *
 * `useHasModule(module)` returns true when the current user has at least one
 * VIEW permission in the given module. Used to gate entire sidebar sections.
 *
 * `useModuleAccessMap()` checks all 6 modules in one pass and returns a map,
 * useful when you need to filter multiple sections (e.g. the sidebar).
 *
 * Both hooks fail-open while the effective bitset is still loading so the nav
 * does not flash-hide on first paint.
 */

import { useMemo } from "react";
import {
  PERMISSIONS_BY_MODULE,
  ADMINISTRATOR_BIT,
  type ModuleId,
} from "@repo/shared";
import { hasBit } from "../lib/bitset";
import { useMyPermissions } from "./use-permissions";

const ALL_MODULES: ModuleId[] = [
  "INVENTORY",
  "SALES",
  "CRM",
  "WEBSITE",
  "REPORTS",
  "SETTINGS",
];

/**
 * Returns true if the current user has at least one `*.VIEW` permission in
 * `module`. Fails open (returns `true`) while the bitset is loading so that
 * nav items don't flicker off during the initial fetch.
 */
export function useHasModule(module: ModuleId): boolean {
  const { data: bits, isLoading } = useMyPermissions();

  return useMemo(() => {
    // Fail-open during load — no nav flicker.
    if (isLoading || !bits) return true;
    // Administrator bypasses all checks.
    if (hasBit(bits, ADMINISTRATOR_BIT)) return true;
    const perms = PERMISSIONS_BY_MODULE[module] ?? [];
    return perms.some((p) => p.action === "VIEW" && hasBit(bits, p.bit));
  }, [bits, isLoading, module]);
}

/**
 * Computes module access for all 6 modules in a single pass over the cached
 * bitset. Useful when the sidebar needs to filter multiple sections at once.
 *
 * Values are `true` when access is granted, `false` when denied,
 * and `true` while the bitset is still loading (fail-open).
 */
export function useModuleAccessMap(): Record<ModuleId, boolean> {
  const { data: bits, isLoading } = useMyPermissions();

  return useMemo(() => {
    const result = {} as Record<ModuleId, boolean>;

    // Fail-open during load.
    if (isLoading || !bits) {
      for (const moduleId of ALL_MODULES) result[moduleId] = true;
      return result;
    }

    // Administrator has access to everything.
    const isAdmin = hasBit(bits, ADMINISTRATOR_BIT);
    for (const moduleId of ALL_MODULES) {
      if (isAdmin) {
        result[moduleId] = true;
        continue;
      }
      const perms = PERMISSIONS_BY_MODULE[moduleId] ?? [];
      result[moduleId] = perms.some(
        (p) => p.action === "VIEW" && hasBit(bits, p.bit),
      );
    }

    return result;
  }, [bits, isLoading]);
}
