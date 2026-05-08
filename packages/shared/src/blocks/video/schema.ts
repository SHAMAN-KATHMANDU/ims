import { z } from "zod";
import { ImageRefSchema } from "../../site-schema/media";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Video props — youtube, vimeo, or direct mp4.
 * posterUrl accepts either a string URL (legacy) or an ImageRef object.
 */
export interface VideoProps {
  source: "youtube" | "vimeo" | "mp4";
  url: string;
  aspectRatio?: "16/9" | "4/3" | "1/1";
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  caption?: string;
  posterUrl?: string | { assetId: string } | { url: string };
  rounded?: boolean;
}

/**
 * Zod schema for video props validation.
 */
export const VideoSchema = z
  .object({
    source: z.enum(["youtube", "vimeo", "mp4"]),
    url: str(2000),
    aspectRatio: z.enum(["16/9", "4/3", "1/1"]).optional(),
    autoplay: z.boolean().optional(),
    loop: z.boolean().optional(),
    muted: z.boolean().optional(),
    caption: optStr(300),
    posterUrl: z.union([str(1000), ImageRefSchema]).optional(),
    rounded: z.boolean().optional(),
  })
  .strict();

export type VideoInput = z.infer<typeof VideoSchema>;
