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

  // Per-field fallback: fork → canonical → in-code blueprint. The previous
  // all-or-nothing logic short-circuited on the canonical row when it had
  // ANY truthy field (notably `defaultPages: []` written by the seed —
  // empty arrays are truthy in JS), so the resolver returned `layouts:
  // undefined` and `seedLayoutsFromBlueprint` wrote empty trees for every
  // scope ⇒ "No blocks yet" after every Apply. Treat empty objects/arrays
  // as "no override" so the in-code blueprint is what actually fills the
  // tenant's draft tree.
  const inCode = TEMPLATE_BLUEPRINTS[slug] ?? null;

  const layouts =
    pickLayoutsOverride(options?.tenantFork?.defaultLayouts) ??
    pickLayoutsOverride(options?.canonicalTemplate?.defaultLayouts) ??
    inCode?.layouts;

  const defaultThemeTokens =
    pickTokensOverride(options?.tenantFork?.defaultThemeTokens) ??
    pickTokensOverride(options?.canonicalTemplate?.defaultThemeTokens) ??
    inCode?.defaultThemeTokens;

  const defaultPages =
    pickPagesOverride(options?.tenantFork?.defaultPages) ??
    pickPagesOverride(options?.canonicalTemplate?.defaultPages) ??
    inCode?.defaultPages;

  if (!layouts && !defaultThemeTokens && !defaultPages) return null;

  return { slug, layouts, defaultThemeTokens, defaultPages };
}

/** Treat null/undefined/empty-object as "no override" so the in-code
 *  blueprint can provide layouts. */
function pickLayoutsOverride(
  value: unknown,
): Partial<Record<string, BlockNode[]>> | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (Object.keys(value as object).length === 0) return undefined;
  return value as Partial<Record<string, BlockNode[]>>;
}

function pickTokensOverride(value: unknown): ThemeTokens | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (Object.keys(value as object).length === 0) return undefined;
  return value as ThemeTokens;
}

function pickPagesOverride(value: unknown): any {
  if (!Array.isArray(value)) return undefined;
  if (value.length === 0) return undefined;
  return value;
}
