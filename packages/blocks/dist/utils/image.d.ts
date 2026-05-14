import type { ImageRef } from "@repo/shared";
export type ImageResolveOptions = {
    w?: number;
    q?: number;
    format?: "webp" | "avif";
};
export declare function resolveImageUrl(url: string | null | undefined, opts?: ImageResolveOptions): string;
/**
 * Map of resolved MediaAsset rows keyed by id. Threaded through
 * `BlockDataContext.assets` by tenant-site page routes; pass it to
 * `normalizeImageRef()` so `{ assetId }` refs resolve to the real
 * publicUrl synchronously at render time. Without it, asset-id refs
 * render as empty strings (matching the prior placeholder behaviour).
 */
export type AssetMap = Record<string, {
    publicUrl: string;
}>;
export declare function normalizeImageRef(ref: string | ImageRef | null | undefined, assets?: AssetMap): string;
//# sourceMappingURL=image.d.ts.map