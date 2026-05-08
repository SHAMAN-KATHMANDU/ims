import { z } from "zod";
import { ImageRefSchema } from "../../site-schema/media";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Logo cloud props — press / partners grid.
 * Logo src accepts either a string URL (legacy) or an ImageRef object.
 */
export interface LogoCloudProps {
  heading?: string;
  logos: { src: string | { assetId: string } | { url: string }; alt: string }[];
  logoHeight?: number;
  grayscale?: boolean;
  columns?: 3 | 4 | 5 | 6;
}

/**
 * Zod schema for logo-cloud props validation.
 */
export const LogoCloudSchema = z
  .object({
    heading: optStr(200),
    logos: z
      .array(
        z
          .object({ src: z.union([str(1000), ImageRefSchema]), alt: str(200) })
          .strict(),
      )
      .max(24),
    logoHeight: z.number().int().min(16).max(200).optional(),
    grayscale: z.boolean().optional(),
    columns: z
      .union([z.literal(3), z.literal(4), z.literal(5), z.literal(6)])
      .optional(),
  })
  .strict();

export type LogoCloudInput = z.infer<typeof LogoCloudSchema>;
