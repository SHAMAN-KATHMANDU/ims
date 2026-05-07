/**
 * Block catalog adapter.
 *
 * Re-exports and adapts the shared BLOCK_CATALOG_ENTRIES for the editor UI.
 * Provides convenience functions to look up entries and create blocks.
 */

import type { BlockKind } from "@repo/shared";
import { BLOCK_CATALOG_ENTRIES } from "@repo/shared";
import type { CatalogEntry } from "@repo/shared";
import { createBlock } from "../tree/ids";

// Re-export types for use in the editor
export type { CatalogEntry, CatalogCategory } from "@repo/shared";

export const BLOCK_CATALOG: readonly CatalogEntry[] = BLOCK_CATALOG_ENTRIES;

/**
 * Get the catalog entry for a block kind.
 */
export function getCatalogEntry(kind: BlockKind): CatalogEntry | undefined {
  return BLOCK_CATALOG.find((e) => e.kind === kind);
}

/**
 * List all catalog entries for blocks valid in a given scope.
 * If no scope is provided, return all entries.
 */
export function listForScope(scope?: string): readonly CatalogEntry[] {
  if (!scope) return BLOCK_CATALOG;
  return BLOCK_CATALOG.filter(
    (e) => !e.scopes || (e.scopes as readonly string[]).includes(scope),
  );
}

/**
 * Create a new block from a catalog entry, using its default props.
 */
export function createBlockFromCatalog(kind: BlockKind) {
  return createBlock(kind);
}
