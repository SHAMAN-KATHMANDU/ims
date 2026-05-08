/**
 * Site template blueprints — central registry of all template layouts and theme tokens.
 *
 * When a tenant picks a template, the sites service uses getTemplateBlueprint()
 * to fetch the blueprint, then seeds SiteLayout rows for each scope (home,
 * products-index, product-detail, offers, cart) from the matching blueprint.
 */

import type { TemplateBlueprint } from "@repo/shared";
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

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

export type BlueprintScope =
  | "home"
  | "products-index"
  | "product-detail"
  | "offers"
  | "cart"
  | "blog-index"
  | "blog-post"
  | "contact"
  | "page"
  | "404";

export const BLUEPRINT_SCOPES = [
  "home",
  "products-index",
  "product-detail",
  "offers",
  "cart",
  "blog-index",
  "blog-post",
  "contact",
  "page",
  "404",
] as const satisfies readonly BlueprintScope[];

// Re-export the interface for external consumers
export type { TemplateBlueprint } from "@repo/shared";

// ---------------------------------------------------------------------------
// Blueprint Registry
// ---------------------------------------------------------------------------

export const TEMPLATE_BLUEPRINTS: Record<string, TemplateBlueprint> = {
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
