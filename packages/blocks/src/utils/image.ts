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

export function normalizeImageRef(
  ref: string | ImageRef | null | undefined,
): string {
  if (!ref) return "";
  if (typeof ref === "string") return ref;
  if ("url" in ref) return ref.url || "";
  if ("assetId" in ref) {
    // TODO: resolve assetId to MediaAsset URL via public API
    return "";
  }
  return "";
}
