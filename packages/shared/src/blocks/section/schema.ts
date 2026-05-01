import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Section props — container with background + padding presets.
 */
export interface SectionProps {
  background?: "default" | "surface" | "accent" | "inverted";
  paddingY?: "none" | "compact" | "balanced" | "spacious";
  maxWidth?: "narrow" | "default" | "wide" | "full";
  backgroundImage?: string;
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
    backgroundImage: optStr(1000),
    backgroundOverlay: z.enum(["none", "light", "dark"]).optional(),
  })
  .strict();

export type SectionInput = z.infer<typeof SectionSchema>;
