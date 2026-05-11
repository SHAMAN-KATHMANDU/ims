/**
 * Walk a BlockNode tree and collect every `{ assetId }` reference for
 * batch resolution. Each page route calls this once on its merged block
 * tree, hands the result to `getPublicAssets()`, and threads the
 * returned map into `BlockDataContext.assets` so blocks can resolve
 * refs synchronously at render time.
 *
 * Recognises common assetId-bearing field shapes across blocks:
 *   - `{ assetId: string }` (ImageRef)
 *   - `{ logoAssetId: string }` (NavBarBrand object form)
 *   - any nested object whose value is an object with `assetId`
 *
 * Conservative — when in doubt, skip. The cost of a missing collected id
 * is one missing image; the cost of a false positive is a wasted lookup.
 * Caps the result list at 50 ids to keep batch endpoint requests small.
 */

import type { BlockNode } from "@repo/shared";

export function collectAssetIds(nodes: BlockNode[] | undefined): string[] {
  if (!nodes || nodes.length === 0) return [];
  const out = new Set<string>();
  for (const node of nodes) {
    walk(node.props, out);
    if (Array.isArray(node.children) && node.children.length > 0) {
      for (const id of collectAssetIds(node.children)) out.add(id);
    }
  }
  return Array.from(out).slice(0, 50);
}

function walk(value: unknown, out: Set<string>): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) walk(item, out);
    return;
  }
  const obj = value as Record<string, unknown>;
  // Direct assetId-bearing keys we know about.
  for (const key of ["assetId", "logoAssetId"]) {
    const candidate = obj[key];
    if (typeof candidate === "string" && candidate.length > 0) {
      out.add(candidate);
    }
  }
  // Recurse into any object value (covers nested cards, items, scenes, etc.)
  for (const key of Object.keys(obj)) {
    walk(obj[key], out);
  }
}
