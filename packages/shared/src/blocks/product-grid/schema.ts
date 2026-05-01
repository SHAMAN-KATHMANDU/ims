import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Product grid props — featured / category / manual product grid.
 */
export interface ProductGridProps {
  source:
    | "featured"
    | "category"
    | "manual"
    | "newest"
    | "on-sale"
    | "price-low"
    | "price-high"
    | "collection"
    | "offers";
  categoryId?: string;
  productIds?: string[];
  /**
   * When `source === "collection"`, identifies which admin-curated
   * collection to pull from. Ignored for other sources.
   */
  collectionSlug?: string;
  limit: number;
  columns: 2 | 3 | 4 | 5;
  cardVariant: "bordered" | "bare" | "card";
  heading?: string;
  eyebrow?: string;
  showCategory?: boolean;
  showPrice?: boolean;
  showDiscount?: boolean;
  cardAspectRatio?: "1/1" | "3/4" | "4/5" | "16/9";
  /**
   * Grid (default) keeps the existing N-column layout. Carousel
   * switches to a horizontally scrolling row with scroll-snap and
   * prev/next controls — matches the "Featured / Exclusives / Top
   * Picks" carousels on reference designs.
   */
  layout?: "grid" | "carousel";
  /**
   * Optional "View more" link (e.g. /offers, /collections/exclusives).
   * Rendered as a small button under the carousel/grid.
   */
  viewMoreHref?: string;
  viewMoreLabel?: string;
}

/**
 * Zod schema for product-grid props validation.
 */
export const ProductGridSchema = z
  .object({
    source: z.enum([
      "featured",
      "category",
      "manual",
      "newest",
      "on-sale",
      "price-low",
      "price-high",
      "collection",
      "offers",
    ]),
    categoryId: optStr(80),
    productIds: z.array(z.string().max(80)).max(50).optional(),
    collectionSlug: optStr(60),
    limit: z.number().int().min(1).max(50),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    cardVariant: z.enum(["bordered", "bare", "card"]),
    heading: optStr(200),
    eyebrow: optStr(100),
    showCategory: z.boolean().optional(),
    showPrice: z.boolean().optional(),
    showDiscount: z.boolean().optional(),
    cardAspectRatio: z.enum(["1/1", "3/4", "4/5", "16/9"]).optional(),
    layout: z.enum(["grid", "carousel"]).optional(),
    viewMoreHref: optStr(200),
    viewMoreLabel: optStr(50),
  })
  .strict();

export type ProductGridInput = z.infer<typeof ProductGridSchema>;
