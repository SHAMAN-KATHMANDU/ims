/**
 * Block catalog — palette metadata + default-prop factories for every BlockKind.
 *
 * The catalog itself lives in `@repo/shared/blocks` (one module per kind);
 * this file is the editor's thin adapter — it re-exports the shared registry
 * plus a couple of editor-only helpers (`getCatalogEntry`, `listForScope`,
 * `createBlockFromCatalog`).
 *
 * To add a new block kind: add a module under `packages/shared/src/blocks/<kind>/`
 * and register it in `packages/shared/src/blocks/index.ts`.
 */

import type { BlockKind, BlockNode } from "@repo/shared";
import {
  BLOCK_CATALOG_ENTRIES,
  type CatalogEntry,
  type CatalogCategory,
} from "@repo/shared/blocks";

export type { CatalogEntry, CatalogCategory };

export const BLOCK_CATALOG: readonly CatalogEntry[] = BLOCK_CATALOG_ENTRIES;

const CATALOG_BY_KIND: Partial<Record<BlockKind, CatalogEntry>> =
  Object.fromEntries(
    BLOCK_CATALOG.map((entry) => [entry.kind, entry]),
  ) as Partial<Record<BlockKind, CatalogEntry>>;

export function getCatalogEntry(kind: string): CatalogEntry | undefined {
  return CATALOG_BY_KIND[kind as BlockKind];
}

export function listForScope(
  scope:
    | "home"
    | "products-index"
    | "product-detail"
    | "page"
    | "header"
    | "footer"
    | string,
): CatalogEntry[] {
  return BLOCK_CATALOG.filter(
    (entry) =>
      !entry.scopes || (entry.scopes as string[]).includes(scope as string),
  );
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `b_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function createBlockFromCatalog(entry: CatalogEntry): BlockNode {
  return {
    id: randomId(),
    kind: entry.kind,
    props: entry.createDefaultProps() as BlockNode["props"],
  };
}
