/**
 * Site template blueprints — central registry of all template layouts and theme tokens.
 *
 * When a tenant picks a template, the sites service uses getTemplateBlueprint()
 * to fetch the blueprint, then seeds SiteLayout rows for each scope (home,
 * products-index, product-detail, offers, cart) from the matching blueprint.
 */

import type { TemplateBlueprint, ThemeTokens, BlockNode } from "@repo/shared";
import { maisonBlueprint } from "./maison";
import { foldBlueprint } from "./fold";
import { forgeBlueprint } from "./forge";
import { lumenBlueprint } from "./lumen";
import { voltBlueprint } from "./volt";
import { auricBlueprint } from "./auric";
import { pantryBlueprint } from "./pantry";
import { ridgeBlueprint } from "./ridge";
import { verdantBlueprint } from "./verdant";
import { foxgloveBlueprint } from "./foxglove";
import { blankBlueprint } from "./blank";

// ---------------------------------------------------------------------------
// Type definitions — single source of truth lives in @repo/shared
// ---------------------------------------------------------------------------

export type { BlueprintScope, TemplateBlueprint } from "@repo/shared";
export { BLUEPRINT_SCOPES } from "@repo/shared";

// ---------------------------------------------------------------------------
// Blueprint Registry
// ---------------------------------------------------------------------------

export const TEMPLATE_BLUEPRINTS: Record<string, TemplateBlueprint> = {
  blank: blankBlueprint,
  maison: maisonBlueprint,
  fold: foldBlueprint,
  forge: forgeBlueprint,
  lumen: lumenBlueprint,
  volt: voltBlueprint,
  auric: auricBlueprint,
  pantry: pantryBlueprint,
  ridge: ridgeBlueprint,
  verdant: verdantBlueprint,
  foxglove: foxgloveBlueprint,
};

/**
 * Look up the blueprint for a template slug with fork-awareness.
 *
 * Fallback chain:
 * 1. If tenantId provided, check for tenant fork → use fork's defaultLayouts + defaultThemeTokens
 * 2. Canonical SiteTemplate row (from DB) → use its defaultLayouts + defaultThemeTokens
 * 3. In-code TEMPLATE_BLUEPRINTS map (fallback for new templates before DB population)
 *
 * Returns null for unknown slugs (new templates added to the DB before a blueprint
 * is registered here — fall back to the editor's empty-tree state).
 *
 * This function is used by pickTemplate to seed layouts when a tenant applies a
 * template. If a tenant has forked a template and edited it, their fork's blocks
 * override the canonical blueprint.
 */
export function getTemplateBlueprint(
  slug: string | null | undefined,
  options?: {
    canonicalTemplate?: {
      defaultLayouts?: unknown;
      defaultThemeTokens?: unknown;
      defaultPages?: unknown;
    } | null;
    tenantFork?: {
      defaultLayouts?: unknown;
      defaultThemeTokens?: unknown;
      defaultPages?: unknown;
    } | null;
  },
): TemplateBlueprint | null {
  if (!slug) return null;

  // 1. Prefer tenant fork if provided and has layouts/tokens/pages
  if (options?.tenantFork) {
    const fork = options.tenantFork;
    if (fork.defaultLayouts || fork.defaultThemeTokens || fork.defaultPages) {
      return {
        slug,
        layouts: fork.defaultLayouts
          ? (fork.defaultLayouts as Partial<Record<string, BlockNode[]>>)
          : undefined,
        defaultThemeTokens: fork.defaultThemeTokens as ThemeTokens | undefined,
        defaultPages: fork.defaultPages as any,
      };
    }
  }

  // 2. Fall back to canonical template if provided and has layouts/tokens/pages
  if (options?.canonicalTemplate) {
    const canonical = options.canonicalTemplate;
    if (
      canonical.defaultLayouts ||
      canonical.defaultThemeTokens ||
      canonical.defaultPages
    ) {
      return {
        slug,
        layouts: canonical.defaultLayouts
          ? (canonical.defaultLayouts as Partial<Record<string, BlockNode[]>>)
          : undefined,
        defaultThemeTokens: canonical.defaultThemeTokens as
          | ThemeTokens
          | undefined,
        defaultPages: canonical.defaultPages as any,
      };
    }
  }

  // 3. Fall back to in-code blueprint registry
  return TEMPLATE_BLUEPRINTS[slug] ?? null;
}
