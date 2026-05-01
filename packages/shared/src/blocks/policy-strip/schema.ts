import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Policy item.
 */
export interface PolicyItem {
  label: string;
  detail?: string;
  icon?: "shipping" | "returns" | "secure" | "support" | "warranty" | "gift";
  href?: string;
}

/**
 * Policy strip props — shipping / returns / trust icons.
 */
export interface PolicyStripProps {
  heading?: string;
  items: PolicyItem[];
  layout?: "inline" | "grid";
  columns?: 2 | 3 | 4;
  dark?: boolean;
}

/**
 * Zod schema for policy-strip props validation.
 */
export const PolicyStripSchema = z
  .object({
    heading: optStr(120),
    items: z
      .array(
        z
          .object({
            label: str(80),
            detail: optStr(200),
            icon: z
              .enum([
                "shipping",
                "returns",
                "secure",
                "support",
                "warranty",
                "gift",
              ])
              .optional(),
            href: optStr(1000),
          })
          .strict(),
      )
      .min(1)
      .max(8),
    layout: z.enum(["inline", "grid"]).optional(),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional(),
    dark: z.boolean().optional(),
  })
  .strict();

export type PolicyStripInput = z.infer<typeof PolicyStripSchema>;
