import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Utility bar — top strip with small links.
 */
export interface UtilityBarProps {
  items?: Array<{
    label: string;
    href: string;
  }>;
  align?: "start" | "center" | "end" | "between";
}

/**
 * Zod schema for utility-bar props validation.
 */
export const UtilityBarSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            label: str(100),
            href: str(500),
          })
          .strict(),
      )
      .optional(),
    align: z.enum(["start", "center", "end", "between"]).optional(),
  })
  .strict();

export type UtilityBarInput = z.infer<typeof UtilityBarSchema>;
