import { z } from "zod";
import { ImageRefSchema } from "../../site-schema/media";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Story split props — side-by-side image + narrative.
 * imageUrl and videoUrl accept either string URLs (legacy) or ImageRef objects.
 */
export interface StorySplitProps {
  eyebrow?: string;
  title: string;
  body: string;
  imageSide: "left" | "right";
  imageUrl?: string | { assetId: string } | { url: string };
  imageCaption?: string;
  ctaHref?: string;
  ctaLabel?: string;
  mediaType?: "image" | "video";
  videoUrl?: string;
}

/**
 * Zod schema for story-split props validation.
 */
export const StorySplitSchema = z
  .object({
    eyebrow: optStr(80),
    title: str(200),
    body: z.string().max(2000),
    imageSide: z.enum(["left", "right"]),
    imageUrl: z.union([str(1000), ImageRefSchema]).optional(),
    imageCaption: optStr(200),
    ctaHref: optStr(1000),
    ctaLabel: optStr(60),
    mediaType: z.enum(["image", "video"]).optional(),
    videoUrl: optStr(2000),
  })
  .strict();

export type StorySplitInput = z.infer<typeof StorySplitSchema>;
