import { z } from "zod";

/**
 * ImageRef — flexible reference to an image: either a direct URL or a MediaAsset ID.
 *
 * Forward-only schema: new picks via MediaPicker produce { assetId },
 * legacy string URLs remain valid forever. Renderer prefers assetId when present.
 */
export type ImageRef = { assetId: string } | { url: string };

export const ImageRefSchema = z.union([
  z.object({ assetId: z.string().uuid() }).strict(),
  z.object({ url: z.string().trim().min(1).max(2000) }).strict(),
]);

export type ImageRefInput = z.infer<typeof ImageRefSchema>;
