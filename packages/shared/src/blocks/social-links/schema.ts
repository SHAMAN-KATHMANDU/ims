import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Social links — Instagram, Pinterest, TikTok, etc.
 */
export interface SocialLinksProps {
  items?: Array<{
    platform: string;
    handle?: string;
    href: string;
  }>;
  variant?: "text" | "icons-only" | "icons-pill";
  align?: "start" | "center" | "end";
}

/**
 * Zod schema for social-links props validation.
 */
export const SocialLinksSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            platform: str(50),
            handle: optStr(100),
            href: str(500),
          })
          .strict(),
      )
      .optional(),
    variant: z.enum(["text", "icons-only", "icons-pill"]).optional(),
    align: z.enum(["start", "center", "end"]).optional(),
  })
  .strict();

export type SocialLinksInput = z.infer<typeof SocialLinksSchema>;
