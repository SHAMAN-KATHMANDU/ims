import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Hero props — top-of-page brand hero with CTA.
 */
export interface HeroProps {
  variant:
    | "minimal"
    | "standard"
    | "luxury"
    | "boutique"
    | "editorial"
    | "video"
    | "shoppable";
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  imageUrl?: string;
  heroLayout?: "centered" | "split-left" | "split-right" | "overlay";
  /** video variant only: mp4/webm source. Required when variant = "video". */
  videoUrl?: string;
  /** video variant only: poster image shown before playback. */
  videoPoster?: string;
  /**
   * shoppable variant only: product IDs to render as a compact shelf
   * beneath the hero copy. Order is preserved; unknown IDs skipped.
   */
  shoppableProductIds?: string[];
}

/**
 * Zod schema for hero props validation.
 */
export const HeroSchema = z
  .object({
    variant: z.enum([
      "minimal",
      "standard",
      "luxury",
      "boutique",
      "editorial",
      "video",
      "shoppable",
    ]),
    title: optStr(200),
    subtitle: optStr(400),
    ctaLabel: optStr(60),
    ctaHref: optStr(1000),
    imageUrl: optStr(1000),
    heroLayout: z
      .enum(["centered", "split-left", "split-right", "overlay"])
      .optional(),
    videoUrl: optStr(2000),
    videoPoster: optStr(1000),
    shoppableProductIds: z.array(z.string().max(80)).max(8).optional(),
  })
  .strict();

export type HeroInput = z.infer<typeof HeroSchema>;
