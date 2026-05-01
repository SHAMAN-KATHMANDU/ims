import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Bundle spotlight — featured product bundle with discount highlight.
 */
export interface BundleSpotlightProps {
  slug: string;
  heading?: string;
  eyebrow?: string;
  description?: string;
  layout?: "split" | "stacked";
  showProducts?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
  buttonStyle?: "primary" | "outline" | "ghost";
}

/**
 * Zod schema for bundle-spotlight props validation.
 */
export const BundleSpotlightSchema = z
  .object({
    slug: str(200),
    heading: optStr(200),
    eyebrow: optStr(100),
    description: optStr(2000),
    layout: z.enum(["split", "stacked"]).optional(),
    showProducts: z.boolean().optional(),
    ctaLabel: optStr(80),
    ctaHref: optStr(1000),
    buttonStyle: z.enum(["primary", "outline", "ghost"]).optional(),
  })
  .strict();

export type BundleSpotlightInput = z.infer<typeof BundleSpotlightSchema>;
