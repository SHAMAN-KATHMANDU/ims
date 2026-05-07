/**
 * Scope and block validity rules.
 *
 * Determines which blocks are valid in which scopes.
 * Reads scope restrictions from catalog entries.
 */

import type { BlockKind, SiteLayoutScope } from "@repo/shared";
import { SITE_LAYOUT_SCOPES } from "@repo/shared";
import { getCatalogEntry } from "./block-catalog";

export const BLUEPRINT_SCOPES = SITE_LAYOUT_SCOPES;

export type BlueprintScope = SiteLayoutScope;

/**
 * Check if a block kind is allowed in a given scope.
 * If the catalog entry has no scope restriction, the block is allowed everywhere.
 */
export function isKindAllowedOnScope(
  kind: BlockKind,
  scope: SiteLayoutScope,
): boolean {
  const entry = getCatalogEntry(kind);
  if (!entry) return false;
  if (!entry.scopes) return true; // No restriction = allowed everywhere
  return entry.scopes.includes(scope);
}

/**
 * List all scopes where a block kind is allowed.
 * If the entry has no scope restriction, return all scopes.
 */
export function listScopesForKind(kind: BlockKind): readonly SiteLayoutScope[] {
  const entry = getCatalogEntry(kind);
  if (!entry) return [];
  if (!entry.scopes) return BLUEPRINT_SCOPES;
  return entry.scopes;
}
