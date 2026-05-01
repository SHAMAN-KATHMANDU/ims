import { z } from "zod";

/**
 * PDP gallery — product photo gallery with zoom and layout options.
 */
export interface PdpGalleryProps {
  layout: "thumbs-below" | "thumbs-left" | "stacked";
  enableZoom: boolean;
  aspectRatio?: "1/1" | "3/4" | "4/5" | "16/9";
}

/**
 * Zod schema for pdp-gallery props validation.
 */
export const PdpGallerySchema = z
  .object({
    layout: z.enum(["thumbs-below", "thumbs-left", "stacked"]),
    enableZoom: z.boolean(),
    aspectRatio: z.enum(["1/1", "3/4", "4/5", "16/9"]).optional(),
  })
  .strict();

export type PdpGalleryInput = z.infer<typeof PdpGallerySchema>;
