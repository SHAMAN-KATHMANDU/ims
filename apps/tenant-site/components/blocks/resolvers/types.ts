/**
 * Per-block server resolver contract.
 *
 * Each IMS-aware block kind owns a `resolve<Kind>` function in this folder.
 * Block components (in `../kinds/`) call their resolver from inside an
 * async server component wrapped in a `Suspense` boundary, so:
 *
 *   - Each block streams independently — a slow product fetch never
 *     blocks the page shell or other blocks.
 *   - The per-block fetch contract is centralised in one folder, easy
 *     to discover, easy to unit-test in isolation.
 *   - The schema↔resolver↔component triple is the new "to add an
 *     IMS-bound block" recipe (see resolvers/README at end of this file).
 *
 * Why not a centralised `Promise.all` resolver tree? It would force
 * first-paint to wait on the slowest block and lose React's streaming
 * SSR. The Suspense+RSC pattern already gives us per-block parallelism
 * for free as long as we stick to async server components.
 */

import type { BlockDataContext } from "../data-context";

/**
 * Context handed to every block resolver. A narrow slice of
 * BlockDataContext — resolvers should NOT reach into the bag-of-everything,
 * they only need tenant identity and site config to call `lib/api.ts`.
 */
export type ResolverContext = Pick<
  BlockDataContext,
  "host" | "tenantId" | "site"
> & {
  /** Optional PDP scope hint — present only on /products/[id] routes. */
  activeProductId?: string;
};

export type BlockResolver<TProps, TData> = (
  props: TProps,
  ctx: ResolverContext,
) => Promise<TData>;

/**
 * Build a ResolverContext from a BlockDataContext + optional PDP hint.
 * Centralised so individual block components don't recreate the projection.
 */
export function toResolverContext(
  dataContext: BlockDataContext,
  activeProductId?: string,
): ResolverContext {
  return {
    host: dataContext.host,
    tenantId: dataContext.tenantId,
    site: dataContext.site,
    activeProductId: activeProductId ?? dataContext.activeProduct?.id,
  };
}
