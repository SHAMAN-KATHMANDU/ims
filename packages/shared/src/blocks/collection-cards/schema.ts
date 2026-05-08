import { z } from "zod";
import { ImageRefSchema } from "../../site-schema/media";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Collection card item.
 * imageUrl accepts either a string URL (legacy) or an ImageRef object.
 */
export interface CollectionCardItem {
  title: string;
  subtitle?: string;
  imageUrl?: string | { assetId: string } | { url: string };
  ctaLabel?: string;
  ctaHref?: string;
}

/**
 * Collection cards props — 2–4 big image-text cards linking to collections.
 */
export interface CollectionCardsProps {
  heading?: string;
  eyebrow?: string;
  /** 2–4 cards. Each card links to a collection, category, or landing. */
  cards: CollectionCardItem[];
  aspectRatio?: "square" | "portrait" | "landscape";
  overlay?: boolean;
}

/**
 * Zod schema for collection-cards props validation.
 */
export const CollectionCardsSchema = z
  .object({
    heading: optStr(200),
    eyebrow: optStr(100),
    cards: z
      .array(
        z
          .object({
            title: str(120),
            subtitle: optStr(200),
            imageUrl: z.union([str(1000), ImageRefSchema]).optional(),
            ctaLabel: optStr(60),
            ctaHref: optStr(1000),
          })
          .strict(),
      )
      .min(1)
      .max(4),
    aspectRatio: z.enum(["square", "portrait", "landscape"]).optional(),
    overlay: z.boolean().optional(),
  })
  .strict();

export type CollectionCardsInput = z.infer<typeof CollectionCardsSchema>;
