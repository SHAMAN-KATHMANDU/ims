/**
 * Site template blueprints — central registry of all template layouts and theme tokens.
 *
 * When a tenant picks a template, the sites service uses getTemplateBlueprint()
 * to fetch the blueprint, then seeds SiteLayout rows for each scope (home,
 * products-index, product-detail, offers) from the matching blueprint.
 */

import type { TemplateBlueprint } from "@repo/shared";
import { editorialBlueprint } from "./editorial";
import { organicBlueprint } from "./organic";
import { darkBlueprint } from "./dark";
import { brutalistBlueprint } from "./brutalist";
import { zenBlueprint } from "./zen";
import { coastalBlueprint } from "./coastal";
import { apothecaryBlueprint } from "./apothecary";
import { retroBlueprint } from "./retro";
import { artisanBlueprint } from "./artisan";
import { galleryBlueprint } from "./gallery";
import { blankBlueprint } from "./blank";

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

export type BlueprintScope =
  | "home"
  | "products-index"
  | "product-detail"
  | "offers";

export const BLUEPRINT_SCOPES = [
  "home",
  "products-index",
  "product-detail",
  "offers",
] as const satisfies readonly BlueprintScope[];

// Re-export the interface for external consumers
export type { TemplateBlueprint } from "@repo/shared";

// ---------------------------------------------------------------------------
// Blueprint Registry
// ---------------------------------------------------------------------------

export const TEMPLATE_BLUEPRINTS: Record<string, TemplateBlueprint> = {
  editorial: editorialBlueprint,
  organic: organicBlueprint,
  dark: darkBlueprint,
  brutalist: brutalistBlueprint,
  zen: zenBlueprint,
  coastal: coastalBlueprint,
  apothecary: apothecaryBlueprint,
  retro: retroBlueprint,
  artisan: artisanBlueprint,
  gallery: galleryBlueprint,
  blank: blankBlueprint,
};

/**
 * Look up the blueprint for a template slug. Returns null for unknown
 * slugs (new templates added to the DB before a blueprint is registered
 * here — fall back to the editor's empty-tree state, which is better than
 * crashing the pick-template flow).
 */
export function getTemplateBlueprint(
  slug: string | null | undefined,
): TemplateBlueprint | null {
  if (!slug) return null;
  return TEMPLATE_BLUEPRINTS[slug] ?? null;
}
