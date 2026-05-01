import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * PDP buybox — name, price, variant picker, quantity, Add to Cart.
 */
export interface PdpBuyboxProps {
  showSku?: boolean;
  showCategory?: boolean;
  showAddToCart?: boolean;
  showDescription?: boolean;
  priceSize?: "sm" | "md" | "lg";
  showVariantPicker?: boolean;
  variantDisplay?: "chips" | "dropdown";
}

/**
 * Zod schema for pdp-buybox props validation.
 */
export const PdpBuyboxSchema = z
  .object({
    showSku: z.boolean().optional(),
    showCategory: z.boolean().optional(),
    showAddToCart: z.boolean().optional(),
    showDescription: z.boolean().optional(),
    priceSize: z.enum(["sm", "md", "lg"]).optional(),
    showVariantPicker: z.boolean().optional(),
    variantDisplay: z.enum(["chips", "dropdown"]).optional(),
  })
  .strict();

export type PdpBuyboxInput = z.infer<typeof PdpBuyboxSchema>;
