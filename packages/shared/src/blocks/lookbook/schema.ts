import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Lookbook — shoppable pinned image.
 */
export interface LookbookPin {
  x: number;
  y: number;
  productId: string;
  label?: string;
}

export interface LookbookScene {
  imageUrl: string;
  alt?: string;
  caption?: string;
  pins: LookbookPin[];
}

export interface LookbookProps {
  heading?: string;
  description?: string;
  scenes: LookbookScene[];
  aspectRatio?: "16/9" | "4/5" | "3/4" | "1/1";
}

/**
 * Zod schema for lookbook props validation.
 */
export const LookbookSchema = z
  .object({
    heading: optStr(200),
    description: optStr(500),
    scenes: z
      .array(
        z
          .object({
            imageUrl: str(1000),
            alt: optStr(200),
            caption: optStr(300),
            pins: z
              .array(
                z
                  .object({
                    x: z.number().min(0).max(1),
                    y: z.number().min(0).max(1),
                    productId: str(80),
                    label: optStr(80),
                  })
                  .strict(),
              )
              .max(12),
          })
          .strict(),
      )
      .min(1)
      .max(10),
    aspectRatio: z.enum(["16/9", "4/5", "3/4", "1/1"]).optional(),
  })
  .strict();

export type LookbookInput = z.infer<typeof LookbookSchema>;
