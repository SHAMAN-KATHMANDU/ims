import { z } from "zod";

const optStr = (max: number) => z.string().trim().max(max).optional();

/**
 * Product listing props — paginated product grid w/ sort + filters.
 */
export interface ProductListingProps {
  pageSize: number;
  defaultSort: "newest" | "price-asc" | "price-desc" | "name-asc";
  showSort: boolean;
  columns: 2 | 3 | 4;
  categoryFilter: boolean;
  showCategory?: boolean;
  showPrice?: boolean;
  showDiscount?: boolean;
  cardAspectRatio?: "1/1" | "3/4" | "4/5" | "16/9";
}

/**
 * Zod schema for product-listing props validation.
 */
export const ProductListingSchema = z
  .object({
    pageSize: z.number().int().min(1).max(100),
    defaultSort: z.enum(["newest", "price-asc", "price-desc", "name-asc"]),
    showSort: z.boolean(),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    categoryFilter: z.boolean(),
    showCategory: z.boolean().optional(),
    showPrice: z.boolean().optional(),
    showDiscount: z.boolean().optional(),
    cardAspectRatio: z.enum(["1/1", "3/4", "4/5", "16/9"]).optional(),
  })
  .strict();

export type ProductListingInput = z.infer<typeof ProductListingSchema>;
