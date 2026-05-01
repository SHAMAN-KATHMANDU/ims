import { z } from "zod";

const optStr = (max: number) => z.string().trim().max(max).optional();

/**
 * Bento showcase props — asymmetric featured-product grid.
 */
export interface BentoShowcaseProps {
  heading?: string;
  eyebrow?: string;
  source: "featured" | "manual";
  productIds?: string[];
  limit: number;
  columns?: 2 | 3 | 4;
  cardVariant?: "bordered" | "bare" | "card";
  showPrice?: boolean;
}

/**
 * Zod schema for bento-showcase props validation.
 */
export const BentoShowcaseSchema = z
  .object({
    heading: optStr(200),
    eyebrow: optStr(100),
    source: z.enum(["featured", "manual"]),
    productIds: z.array(z.string().max(80)).max(10).optional(),
    limit: z.number().int().min(1).max(10),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional(),
    cardVariant: z.enum(["bordered", "bare", "card"]).optional(),
    showPrice: z.boolean().optional(),
  })
  .strict();

export type BentoShowcaseInput = z.infer<typeof BentoShowcaseSchema>;
