import type { ImageRef } from "@repo/shared";
export type ImageResolveOptions = {
    w?: number;
    q?: number;
    format?: "webp" | "avif";
};
export declare function resolveImageUrl(url: string | null | undefined, opts?: ImageResolveOptions): string;
export declare function normalizeImageRef(ref: string | ImageRef | null | undefined): string;
//# sourceMappingURL=image.d.ts.map