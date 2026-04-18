/**
 * Public site endpoint schemas (query params only — no POST bodies).
 */

import { z } from "zod";

/**
 * Supported sort orderings for /public/products. "newest" is the default and
 * matches the legacy behavior. Price sorts order by finalSp; name sorts are
 * case-insensitive. Adding a sort = extending the enum + mapping it in the
 * repository.
 */
export const PRODUCT_SORTS = [
  "newest",
  "price-asc",
  "price-desc",
  "name-asc",
  /**
   * Rank products by units sold in a trailing 90-day window (counted from
   * SaleItem rows on non-deleted sales). Products with zero sales in the
   * window are excluded; if *no* tenant sales fall in the window the
   * endpoint returns an empty result set (not newest) so the "best sellers"
   * label never silently lies.
   */
  "best-selling",
] as const;

export type ProductSort = (typeof PRODUCT_SORTS)[number];

/**
 * EAV attribute filter: a map of `attributeTypeId → attributeValueId`
 * where all entries must match. Express's qs parser turns
 * `?attr[<typeId>]=<valueId>` into a nested object that Zod validates
 * below. An empty object — from either a missing param or `?attr=` —
 * collapses to `undefined` during parsing so the repository sees a clean
 * optional.
 */
const AttributeFilterSchema = z
  .record(z.string().uuid(), z.string().uuid())
  .optional()
  .transform((v) => (v && Object.keys(v).length > 0 ? v : undefined));

/**
 * Opt-in flag for the (expensive) facet computation. Accepts "1"/"true"/"yes"
 * as truthy so the tenant-site can set it from a simple query param. Default
 * is false — facets cost three extra queries and only the products-index
 * sidebar actually renders them.
 */
const IncludeFacetsSchema = z
  .union([z.string(), z.boolean()])
  .optional()
  .transform((v) => {
    if (typeof v === "boolean") return v;
    if (typeof v !== "string") return false;
    return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "yes";
  });

export const ListProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  categoryId: z.string().uuid().optional(),
  search: z.string().trim().min(1).optional(),
  sort: z.enum(PRODUCT_SORTS).default("newest"),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  /** Brand / vendor filter. Products track brand via the vendor relation. */
  vendorId: z.string().uuid().optional(),
  attr: AttributeFilterSchema,
  includeFacets: IncludeFacetsSchema,
});

export type ListProductsQuery = z.infer<typeof ListProductsQuerySchema>;
