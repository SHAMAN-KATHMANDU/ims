import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);

/**
 * Trust strip props — value-prop strip (shipping, returns, support).
 */
export interface TrustStripProps {
  items: { label: string; value: string }[];
  dark?: boolean;
  layout?: "inline" | "grid";
  columns?: 2 | 3 | 4 | 5;
}

/**
 * Zod schema for trust-strip props validation.
 */
export const TrustStripSchema = z
  .object({
    items: z
      .array(z.object({ label: str(80), value: str(80) }).strict())
      .max(10),
    dark: z.boolean().optional(),
    layout: z.enum(["inline", "grid"]).optional(),
    columns: z
      .union([z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
      .optional(),
  })
  .strict();

export type TrustStripInput = z.infer<typeof TrustStripSchema>;
