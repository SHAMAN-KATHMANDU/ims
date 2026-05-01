import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Image props — responsive image with optional caption.
 */
export interface ImageProps {
  src: string;
  alt: string;
  aspectRatio?: "1/1" | "4/3" | "16/9" | "3/4" | "auto";
  rounded?: boolean;
  caption?: string;
  link?: string;
  shadow?: "none" | "sm" | "md" | "lg";
  hoverEffect?: "none" | "zoom" | "lift";
}

/**
 * Zod schema for image props validation.
 */
export const ImageSchema = z
  .object({
    src: str(1000),
    alt: str(200),
    aspectRatio: z.enum(["1/1", "4/3", "16/9", "3/4", "auto"]).optional(),
    rounded: z.boolean().optional(),
    caption: optStr(300),
    link: optStr(1000),
    shadow: z.enum(["none", "sm", "md", "lg"]).optional(),
    hoverEffect: z.enum(["none", "zoom", "lift"]).optional(),
  })
  .strict();

export type ImageInput = z.infer<typeof ImageSchema>;
