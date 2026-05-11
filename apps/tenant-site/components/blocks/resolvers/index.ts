/**
 * Block resolvers barrel.
 *
 * Each IMS-aware block kind is paired with one resolver in this folder.
 * Block components import the resolver directly and call it from inside
 * their async server-component shell — see `../kinds/commerce-blocks.tsx`
 * for the canonical wiring (Suspense fallback + async inner).
 *
 * Phase 2: product-grid extracted from the inline pattern.
 * Phase 3: collection-cards, bundle-spotlight, category-tiles,
 *          pdp-related, fbt, recently-viewed, blog-list, promo-cards.
 */

export type { BlockResolver, ResolverContext } from "./types";
export { toResolverContext } from "./types";

export {
  resolveProductGrid,
  resolveProductGridFromDataContext,
} from "./product-grid";
export {
  resolveCollectionCards,
  type ResolvedCollectionCard,
} from "./collection-cards";
export {
  resolveBundleSpotlight,
  type ResolvedBundle,
} from "./bundle-spotlight";
