/**
 * Content body block-kind allowlist.
 *
 * Limits the CMS body editor's palette to kinds that make sense inside a
 * blog post or custom page (not the full 70-entry catalog the site builder
 * uses). Built as a positive allowlist instead of decorating every block
 * module with a `scopes: ["blog-post", "page"]` array — this keeps the
 * filter colocated with the editor it gates.
 *
 * To add a new kind to the editor: append it here. To preview the
 * filtered palette: call listContentBodyCatalog() — returns CatalogEntry[]
 * in BLOCK_CATALOG_ENTRIES order.
 */

import { BLOCK_CATALOG_ENTRIES, type CatalogEntry } from "@repo/shared";
import type { BlockKind } from "@repo/shared";

export const CONTENT_BODY_KINDS: ReadonlyArray<BlockKind> = [
  // Text + structure
  "heading",
  "rich-text",
  "markdown-body",
  "divider",
  "spacer",
  // Media
  "image",
  "gallery",
  "embed",
  "video",
  // Action
  "button",
  // Interactive content
  "accordion",
  "faq",
  "tabs",
  "testimonials",
  // Marketing modules tenants commonly drop into pages
  "story-split",
  "newsletter",
  "contact-block",
  // Phase 5: reusable BlockNode[] sub-trees
  "snippet-ref",
  // Escape hatch
  "custom-html",
] as const;

const ALLOWED = new Set<string>(CONTENT_BODY_KINDS);

/**
 * Return the full catalog filtered to kinds usable in a content body, in
 * the same order as BLOCK_CATALOG_ENTRIES (which is palette display order).
 */
export function listContentBodyCatalog(): CatalogEntry[] {
  return BLOCK_CATALOG_ENTRIES.filter((entry) => ALLOWED.has(entry.kind));
}

/**
 * Quick membership check — used by the row toolbar to gate the "Convert
 * to" menu (only suggests kinds in the allowlist).
 */
export function isContentBodyKind(kind: string): boolean {
  return ALLOWED.has(kind);
}
