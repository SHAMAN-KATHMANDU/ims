import type { ImageRef } from "@repo/shared";

export type ImageResolveOptions = {
  w?: number;
  q?: number;
  format?: "webp" | "avif";
};

export function resolveImageUrl(
  url: string | null | undefined,
  opts?: ImageResolveOptions,
): string {
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) return url;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (opts?.w && Number.isFinite(opts.w) && opts.w > 0) {
    parsed.searchParams.set("w", String(Math.round(opts.w)));
  }
  if (opts?.q && Number.isFinite(opts.q) && opts.q > 0 && opts.q <= 100) {
    parsed.searchParams.set("q", String(Math.round(opts.q)));
  }
  if (opts?.format) {
    parsed.searchParams.set("fm", opts.format);
  }
  return parsed.toString();
}

/**
 * Map of resolved MediaAsset rows keyed by id. Threaded through
 * `BlockDataContext.assets` by tenant-site page routes; pass it to
 * `normalizeImageRef()` so `{ assetId }` refs resolve to the real
 * publicUrl synchronously at render time. Without it, asset-id refs
 * render as empty strings (matching the prior placeholder behaviour).
 */
export type AssetMap = Record<string, { publicUrl: string }>;

export function normalizeImageRef(
  ref: string | ImageRef | null | undefined,
  assets?: AssetMap,
): string {
  if (!ref) return "";
  if (typeof ref === "string") return ref;
  if ("url" in ref) return ref.url || "";
  if ("assetId" in ref) {
    const id = ref.assetId;
    if (!id) return "";
    const resolved = assets?.[id];
    return resolved?.publicUrl ?? "";
  }
  return "";
}
