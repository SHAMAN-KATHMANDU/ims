import { z } from "zod";

const optStr = (max: number) => z.string().trim().max(max).optional();

/**
 * Category tiles props — shop-by-category hero tiles.
 */
export interface CategoryTilesProps {
  heading?: string;
  columns: 2 | 3 | 4;
  aspectRatio?: "1/1" | "4/5" | "3/4" | "16/9";
  showProductCount?: boolean;
  cardStyle?: "overlay" | "below";
}

/**
 * Zod schema for category-tiles props validation.
 */
export const CategoryTilesSchema = z
  .object({
    heading: optStr(200),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    aspectRatio: z.enum(["1/1", "4/5", "3/4", "16/9"]).optional(),
    showProductCount: z.boolean().optional(),
    cardStyle: z.enum(["overlay", "below"]).optional(),
  })
  .strict();

export type CategoryTilesInput = z.infer<typeof CategoryTilesSchema>;
