import type { ImageRef } from "@repo/shared";

/**
 * resolveImageUrl — single chokepoint for appending CDN query params
 * to remote image URLs.
 *
 * Today the bucket is plain S3 and silently ignores query params. The
 * moment we put a CDN (CloudFront + Lambda@Edge, Imgix, Cloudinary)
 * in front, flipping `w`/`q`/`fm` on across every call site costs a
 * one-line change here instead of touching every block renderer.
 *
 * Call it at the point of render, not during data fetching — the
 * intrinsic size depends on the slot, not the source.
 */

export type ImageResolveOptions = {
  /** Target rendered width in CSS pixels. Upstream CDN converts to DPR variants. */
  w?: number;
  /** JPEG/WebP quality 1-100. Skipping defaults to the CDN's baseline. */
  q?: number;
  /** Encoded format. "webp" is the safe default for broad browser support. */
  format?: "webp" | "avif";
};

export function resolveImageUrl(
  url: string | null | undefined,
  opts?: ImageResolveOptions,
): string {
  if (!url) return "";
  // Leave data URIs, blob URIs, and relative paths untouched — they can't
  // carry query params or they're already sized by the caller.
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
 * normalizeImageRef — converts ImageRef (union of string | { assetId } | { url })
 * to a string URL for rendering.
 *
 * Forward-only compatibility layer: accepts legacy string URLs and ImageRef objects.
 * - If ref is a string, returns it as-is
 * - If ref is { url: "..." }, returns the URL
 * - If ref is { assetId: "..." }, logs a warning and returns empty (deferred to Phase 8.b)
 *
 * TODO Phase 8.b: fetch MediaAsset by assetId from public API and resolve to URL
 */
export function normalizeImageRef(
  ref: string | ImageRef | null | undefined,
): string {
  if (!ref) return "";
  if (typeof ref === "string") return ref;
  if ("url" in ref) return ref.url || "";
  if ("assetId" in ref) {
    // TODO Phase 8.b: resolve assetId to MediaAsset URL via public API
    // For now, log and skip. Block renderers will gracefully handle missing src.
    // eslint-disable-next-line no-console
    console.warn(
      `[tenant-site] Image with assetId ${ref.assetId} not yet resolved (Phase 8.b)`,
    );
    return "";
  }
  return "";
}
