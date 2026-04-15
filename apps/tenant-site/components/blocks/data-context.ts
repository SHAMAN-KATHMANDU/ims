/**
 * BlockDataContext — the already-fetched data a page hands to the block
 * renderer. Blocks read what they need from here instead of making their
 * own fetches, so a route still owns the data fetching contract and we
 * don't double-fetch when the same data is used by multiple blocks.
 *
 * This is a plain object (not a React Context) because most blocks are
 * server components — React Context only works on the client. Threading
 * via props is simpler and works uniformly for server + client blocks.
 */

import type {
  PublicCategory,
  PublicNavPage,
  PublicProduct,
  PublicBlogPostListItem,
  PublicSite,
} from "@/lib/api";

export interface BlockDataContext {
  site: PublicSite;
  host: string;
  tenantId: string;
  categories: PublicCategory[];
  navPages: PublicNavPage[];
  products: PublicProduct[];
  featuredBlogPosts: PublicBlogPostListItem[];
  /** Present on product-detail routes. */
  activeProduct?: PublicProduct | null;
  /** Related-to-active products (same category). */
  relatedProducts?: PublicProduct[];
  /** Page number for products-index scope (1-based). */
  productsPage?: number;
  productsTotal?: number;
  /** Active URL search params (for product-listing / filter blocks). */
  searchParams?: Record<string, string | string[] | undefined>;
}
