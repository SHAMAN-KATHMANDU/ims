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
import {
  TemplatePageDefinitionsSchema,
  type TemplatePageDefinitions,
} from "./template-pages";

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
 * Chrome / dynamic-template scopes that stay scope-keyed. These are not
 * editable as user-facing TenantPages because they're either shared chrome
 * (header/footer), error pages, or templates that render for arbitrary
 * dynamic URLs (product-detail renders for /products/<slug>, blog-post
 * renders for /blog/<slug>, "page" is the default starter tree for new
 * custom pages).
 */
export const CHROME_SCOPES: readonly BlueprintScope[] = [
  "header",
  "footer",
  "product-detail",
  "blog-post",
  "page",
  "404",
] as const;

/**
 * Page scopes — these become real TenantPage rows when a template is
 * applied, with a stable slug each. Editable from the Pages list. Mapping:
 *   home          → slug "/"        (rendered at the tenant-site root)
 *   products-index → slug "products"
 *   offers        → slug "offers"
 *   cart          → slug "cart"
 *   blog-index    → slug "blog"
 *   contact       → slug "contact"
 */
export const PAGE_SCOPE_TO_SLUG: Readonly<
  Partial<Record<BlueprintScope, string>>
> = {
  home: "/",
  "products-index": "products",
  offers: "offers",
  cart: "cart",
  "blog-index": "blog",
  contact: "contact",
} as const;

export const PAGE_SCOPES: readonly BlueprintScope[] = Object.keys(
  PAGE_SCOPE_TO_SLUG,
) as BlueprintScope[];

/** Human-friendly title for the auto-synthesized TenantPage of a page-scope. */
const PAGE_SCOPE_TO_TITLE: Readonly<Partial<Record<BlueprintScope, string>>> = {
  home: "Home",
  "products-index": "Products",
  offers: "Offers",
  cart: "Cart",
  "blog-index": "Blog",
  contact: "Contact",
};

/**
 * Build the auto-synthesized `defaultPages` array for a blueprint by lifting
 * each PAGE_SCOPE layout into a TemplatePageDefinition. Any explicit
 * `blueprint.defaultPages` entries are appended as-is (and win on slug
 * collision via the apply-time upsert). Skips scopes the blueprint omits.
 */
export function synthesizeDefaultPagesFromLayouts(
  blueprint: TemplateBlueprint,
): TemplatePageDefinitions {
  const synthesized: TemplatePageDefinitions = [];
  for (const scope of PAGE_SCOPES) {
    const blocks = blueprint.layouts?.[scope];
    if (!blocks || blocks.length === 0) continue;
    const slug = PAGE_SCOPE_TO_SLUG[scope]!;
    const title = PAGE_SCOPE_TO_TITLE[scope] ?? scope;
    synthesized.push({ slug, title, blocks });
  }
  // Explicit defaultPages take precedence on slug collision; the apply-time
  // upsert is keyed by (tenantId, kind, slug).
  const explicit = blueprint.defaultPages ?? [];
  const explicitSlugs = new Set(explicit.map((p) => p.slug));
  return [
    ...synthesized.filter((p) => !explicitSlugs.has(p.slug)),
    ...explicit,
  ];
}

/**
 * TemplateBlueprint — canonical block tree + theme tokens + custom pages for a template.
 *
 * When a tenant picks a template, the sites service creates SiteLayout rows
 * for each scope (home, products-index, product-detail, offers) from the
 * matching blueprint. The tenant can then edit each layout independently.
 *
 * Custom pages (in defaultPages) are also seeded as TenantPage rows with their
 * associated SiteLayout rows, so they appear in /content/pages and are editable.
 *
 * Each blueprint's home tree is intentionally distinct — different hero
 * variants, different section orderings — so picking Editorial vs. Dark
 * produces visually different output before the tenant edits anything.
 */
export interface TemplateBlueprint {
  slug: string;
  layouts?: Partial<Record<BlueprintScope, Array<BlockNode>>>;
  defaultThemeTokens?: ThemeTokens;
  defaultPages?: TemplatePageDefinitions;
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
  defaultPages: TemplatePageDefinitionsSchema.optional(),
}) as unknown as z.ZodType<TemplateBlueprint>;
