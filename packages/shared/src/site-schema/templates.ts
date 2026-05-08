/**
 * Template schema — shared Zod validation for site templates and their blueprints.
 *
 * Blueprints are configuration objects that define the default block layouts
 * and theme tokens for a given template (e.g., "editorial", "dark", "zen").
 * This schema enforces the shape at seed and validation time.
 */

import { z } from "zod";
import { BlockNodeSchema, type BlockNode } from "./blocks";
import { ThemeTokensSchema, type ThemeTokens } from "./theme";

// ---------------------------------------------------------------------------
// Theme tokens (design system)
// ---------------------------------------------------------------------------

export type { ThemeTokens };
export { ThemeTokensSchema };

// ---------------------------------------------------------------------------
// Branding configuration
// ---------------------------------------------------------------------------

/**
 * Branding configuration — identity and styling metadata.
 *
 * The blueprint applies this to SiteConfig.branding; the tenant can then
 * override individual fields. Identity fields (name, tagline, logoUrl,
 * faviconUrl) are stripped when applying templates so the tenant's profile
 * survives a template switch.
 */
export interface BrandingConfig {
  // Identity (survives template switch; comes from TenantBusinessProfile)
  // name?: string;
  // tagline?: string;
  // logoUrl?: string;
  // faviconUrl?: string;

  // Style overrides (lost on template switch)
  colors?: Record<string, string>; // e.g. { primary: "#...", secondary: "..." }
  theme?: "light" | "dark" | "auto";
}

export const BrandingConfigSchema: z.ZodType<BrandingConfig> = z
  .object({
    colors: z.record(z.string().min(1), z.string()).optional(),
    theme: z.enum(["light", "dark", "auto"]).optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Template blueprint
// ---------------------------------------------------------------------------

export type BlueprintScope =
  | "header"
  | "footer"
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
  "header",
  "footer",
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

/**
 * TemplateBlueprint — canonical block tree + theme tokens for a template.
 *
 * When a tenant picks a template, the sites service creates SiteLayout rows
 * for each scope (home, products-index, product-detail, offers) from the
 * matching blueprint. The tenant can then edit each layout independently.
 *
 * Each blueprint's home tree is intentionally distinct — different hero
 * variants, different section orderings — so picking Editorial vs. Dark
 * produces visually different output before the tenant edits anything.
 */
export interface TemplateBlueprint {
  slug: string;
  layouts?: Partial<Record<BlueprintScope, Array<BlockNode>>>;
  defaultThemeTokens?: ThemeTokens;
}

export const TemplateBlueprintSchema: z.ZodType<TemplateBlueprint> = z.object({
  slug: z.string().min(1).max(100),
  layouts: z
    .record(
      z.enum([
        "header",
        "footer",
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
      ] as const),
      z.array(BlockNodeSchema),
    )
    .optional(),
  defaultThemeTokens: ThemeTokensSchema.optional(),
}) as unknown as z.ZodType<TemplateBlueprint>;
