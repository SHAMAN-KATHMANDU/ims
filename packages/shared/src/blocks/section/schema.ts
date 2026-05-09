import { z } from "zod";
import { ImageRefSchema } from "../../site-schema/media";

const str = (max: number) => z.string().trim().max(max);

/**
 * Section props — container with background + padding presets.
 * backgroundImage accepts either a string URL (legacy) or an ImageRef object.
 */
export interface SectionProps {
  background?: "default" | "surface" | "accent" | "inverted";
  paddingY?: "none" | "compact" | "balanced" | "spacious";
  maxWidth?: "narrow" | "default" | "wide" | "full";
  backgroundImage?: string | { assetId: string } | { url: string };
  backgroundOverlay?: "none" | "light" | "dark";
}

/**
 * Zod schema for section props validation.
 */
export const SectionSchema = z
  .object({
    background: z.enum(["default", "surface", "accent", "inverted"]).optional(),
    paddingY: z.enum(["none", "compact", "balanced", "spacious"]).optional(),
    maxWidth: z.enum(["narrow", "default", "wide", "full"]).optional(),
    backgroundImage: z.union([str(1000), ImageRefSchema]).optional(),
    backgroundOverlay: z.enum(["none", "light", "dark"]).optional(),
  })
  .strict();

export type SectionInput = z.infer<typeof SectionSchema>;
