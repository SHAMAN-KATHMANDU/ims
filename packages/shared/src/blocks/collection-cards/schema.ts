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
 * Collection cards props — image-text cards linking to collections.
 *
 * Two modes:
 *   - `source="manual"` (default for backward compat): renders the literal
 *     `cards[]` array exactly as authored.
 *   - `source="auto"`: ignores `cards[]`; the resolver fetches the tenant's
 *     active Collection rows (`/public/collections`) and renders them in
 *     `sortOrder`. Use this on templates that should "just work" against
 *     whatever collections the tenant has set up.
 *
 * `limit` only applies in auto mode (manual already caps at the array
 * length).
 */
export interface CollectionCardsProps {
  source?: "manual" | "auto";
  limit?: number;
  heading?: string;
  eyebrow?: string;
  cards?: CollectionCardItem[];
  aspectRatio?: "square" | "portrait" | "landscape";
  overlay?: boolean;
}

/**
 * Zod schema for collection-cards props validation.
 */
export const CollectionCardsSchema = z
  .object({
    source: z.enum(["manual", "auto"]).optional(),
    limit: z.number().int().min(1).max(12).optional(),
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
      // min(0) so a fresh `source="auto"` block validates with no cards.
      .min(0)
      .max(8)
      .optional(),
    aspectRatio: z.enum(["square", "portrait", "landscape"]).optional(),
    overlay: z.boolean().optional(),
  })
  .strict();

export type CollectionCardsInput = z.infer<typeof CollectionCardsSchema>;
