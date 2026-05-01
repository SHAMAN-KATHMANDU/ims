import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Video props — youtube, vimeo, or direct mp4.
 */
export interface VideoProps {
  source: "youtube" | "vimeo" | "mp4";
  url: string;
  aspectRatio?: "16/9" | "4/3" | "1/1";
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  caption?: string;
  posterUrl?: string;
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
    posterUrl: optStr(1000),
    rounded: z.boolean().optional(),
  })
  .strict();

export type VideoInput = z.infer<typeof VideoSchema>;
