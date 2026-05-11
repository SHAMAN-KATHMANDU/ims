/**
 * Helper: walk a block tree, collect every `{ assetId }` ref, batch-fetch
 * MediaAsset rows, return the resulting `Record<id, AssetSummary>` ready
 * to drop into `BlockDataContext.assets`.
 *
 * Page routes call this once per request after they've assembled the
 * full block tree (header + page + footer chrome combined) so the asset
 * fetch happens in parallel with the other dataContext fetches via
 * `Promise.all` if the caller wants.
 *
 * Returns an empty map when there are no asset refs — the caller should
 * still pass it into dataContext so `normalizeImageRef(ref, assets)`
 * resolves URL refs without needing a defensive `assets ?? {}`.
 */

import type { BlockNode } from "@repo/shared";
import { collectAssetIds } from "./collect-asset-ids";
import { getPublicAssets, type PublicAssetSummary } from "@/lib/api";

export async function buildAssetMap(
  host: string,
  tenantId: string,
  blocks: BlockNode[] | null | undefined,
): Promise<Record<string, PublicAssetSummary>> {
  const ids = collectAssetIds(blocks ?? []);
  if (ids.length === 0) return {};
  const assets = await getPublicAssets(host, tenantId, ids);
  const map: Record<string, PublicAssetSummary> = {};
  for (const a of assets) map[a.id] = a;
  return map;
}
