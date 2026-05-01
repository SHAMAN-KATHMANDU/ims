import { z } from "zod";

const optStr = (max: number) => z.string().trim().max(max).optional();

/**
 * Product filters props — sidebar with category / price / brand / attribute facets.
 */
export interface ProductFiltersProps {
  heading?: string;
  show: {
    category: boolean;
    priceRange: boolean;
    brand: boolean;
    /**
     * Attribute-type IDs whose facets should render. Empty = show every
     * attribute returned in the facet payload.
     */
    attributes?: string[];
  };
  /**
   * Sticky offset in pixels when the sidebar is nested in a columns
   * container. Default: 96 (below the tenant header). `0` disables stick.
   */
  stickyOffset?: number;
}

/**
 * Zod schema for product-filters props validation.
 */
export const ProductFiltersSchema = z
  .object({
    heading: optStr(80),
    show: z
      .object({
        category: z.boolean(),
        priceRange: z.boolean(),
        brand: z.boolean(),
        attributes: z.array(z.string().max(80)).max(20).optional(),
      })
      .strict(),
    stickyOffset: z.number().int().min(0).max(400).optional(),
  })
  .strict();

export type ProductFiltersInput = z.infer<typeof ProductFiltersSchema>;
