import { z } from "zod";
import { ImageRefSchema } from "../../site-schema/media";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Gallery — grid, masonry, or slideshow with optional lightbox.
 * Image src accepts either a string URL (legacy) or an ImageRef object.
 */
export interface GalleryProps {
  images: {
    src: string | { assetId: string } | { url: string };
    alt: string;
    caption?: string;
  }[];
  layout: "grid" | "masonry" | "slideshow";
  columns: 2 | 3 | 4;
  lightbox?: boolean;
  aspectRatio?: "1/1" | "4/3" | "3/4" | "16/9" | "auto";
  gap?: "sm" | "md" | "lg";
  hoverEffect?: "none" | "zoom" | "caption";
  rounded?: boolean;
}

/**
 * Zod schema for gallery props validation.
 */
export const GallerySchema = z
  .object({
    images: z
      .array(
        z
          .object({
            src: z.union([str(2000), ImageRefSchema]),
            alt: str(200),
            caption: optStr(300),
          })
          .strict(),
      )
      .max(50),
    layout: z.enum(["grid", "masonry", "slideshow"]),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    lightbox: z.boolean().optional(),
    aspectRatio: z.enum(["1/1", "4/3", "3/4", "16/9", "auto"]).optional(),
    gap: z.enum(["sm", "md", "lg"]).optional(),
    hoverEffect: z.enum(["none", "zoom", "caption"]).optional(),
    rounded: z.boolean().optional(),
  })
  .strict();

export type GalleryInput = z.infer<typeof GallerySchema>;
