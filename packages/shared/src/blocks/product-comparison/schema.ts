import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Product comparison — compare 2–4 products side-by-side.
 */
export interface ProductComparisonProps {
  heading?: string;
  description?: string;
  productIds: string[];
  attributes?: (
    | "price"
    | "category"
    | "rating"
    | "length"
    | "breadth"
    | "height"
    | "weight"
    | "description"
  )[];
}

/**
 * Zod schema for product-comparison props validation.
 */
export const ProductComparisonSchema = z
  .object({
    heading: optStr(200),
    description: optStr(500),
    // min(0) so a freshly-dropped block from the palette validates
    // before the user picks comparison products via the inspector.
    productIds: z.array(z.string().max(80)).min(0).max(4),
    attributes: z
      .array(
        z.enum([
          "price",
          "category",
          "rating",
          "length",
          "breadth",
          "height",
          "weight",
          "description",
        ]),
      )
      .max(10)
      .optional(),
  })
  .strict();

export type ProductComparisonInput = z.infer<typeof ProductComparisonSchema>;
