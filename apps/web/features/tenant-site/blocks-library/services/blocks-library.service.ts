/**
 * Blocks library service — read-only registry of available block kinds.
 * Derives from packages/shared/src/blocks/index.ts BLOCK_CATALOG_ENTRIES.
 */

import { BLOCK_CATALOG_ENTRIES } from "@repo/shared";

export interface BlockCatalogGrouped {
  category: string;
  blocks: typeof BLOCK_CATALOG_ENTRIES;
}

export function getBlockCatalog() {
  return BLOCK_CATALOG_ENTRIES;
}

export function getBlocksByCategory(): BlockCatalogGrouped[] {
  const grouped = new Map<string, (typeof BLOCK_CATALOG_ENTRIES)[number][]>();

  BLOCK_CATALOG_ENTRIES.forEach((entry) => {
    const cat = entry.category || "other";
    if (!grouped.has(cat)) {
      grouped.set(cat, []);
    }
    grouped.get(cat)!.push(entry);
  });

  return Array.from(grouped.entries()).map(([category, blocks]) => ({
    category,
    blocks: blocks as typeof BLOCK_CATALOG_ENTRIES,
  }));
}

export function getBlockByKind(kind: string) {
  return BLOCK_CATALOG_ENTRIES.find((b) => b.kind === kind);
}

export function getCategories(): string[] {
  const cats = new Set<string>();
  BLOCK_CATALOG_ENTRIES.forEach((b) => {
    cats.add(b.category || "other");
  });
  return Array.from(cats).sort();
}
