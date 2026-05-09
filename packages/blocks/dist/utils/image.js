export function resolveImageUrl(url, opts) {
    if (!url)
        return "";
    if (!/^https?:\/\//i.test(url))
        return url;
    let parsed;
    try {
        parsed = new URL(url);
    }
    catch {
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
export function normalizeImageRef(ref) {
    if (!ref)
        return "";
    if (typeof ref === "string")
        return ref;
    if ("url" in ref)
        return ref.url || "";
    if ("assetId" in ref) {
        // TODO: resolve assetId to MediaAsset URL via public API
        return "";
    }
    return "";
}
