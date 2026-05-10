import type { ProductGridProps } from "@repo/shared";
import { getCollection, getOffers, type PublicProduct } from "@/lib/api";
import type { BlockResolver, ResolverContext } from "./types";
import type { BlockDataContext } from "../data-context";

/**
 * Resolve products for a ProductGridBlock based on its `source` prop.
 *
 * Hot-path sources (`featured`, `category`, `manual`, `newest`, `on-sale`,
 * `price-low`, `price-high`) read from `dataContext.products` so the page
 * boundary's bulk products fetch hydrates them with no extra round-trip.
 *
 * `collection` and `offers` hit dedicated endpoints because they need
 * different filter/sort criteria than the home-page bulk fetch can
 * provide; pulling them from the bag would mean over-fetching the entire
 * tenant catalogue on every page that uses the grid.
 */
export const resolveProductGrid: BlockResolver<
  ProductGridProps,
  PublicProduct[]
> = async (props, ctx) => {
  if (props.source === "offers") {
    const res = await getOffers(ctx.host, ctx.tenantId, { limit: props.limit });
    return res?.products ?? [];
  }
  if (props.source === "collection") {
    if (!props.collectionSlug) return [];
    const res = await getCollection(
      ctx.host,
      ctx.tenantId,
      props.collectionSlug,
      props.limit,
    );
    if (!res) return [];
    const collection = "collection" in res ? res.collection : res;
    return collection.products ?? [];
  }
  // Other sources need the bulk catalogue — caller must pass it via the
  // overload below (so this resolver stays decoupled from BlockDataContext).
  return [];
};

/**
 * Variant of resolveProductGrid that accepts the full BlockDataContext
 * because the legacy filter sources (featured/category/manual/etc.) need
 * the pre-fetched `products` bag from the page boundary.
 *
 * Block components call this overload; tests of the network paths can use
 * the narrower `resolveProductGrid` directly.
 */
export async function resolveProductGridFromDataContext(
  props: ProductGridProps,
  dataContext: BlockDataContext,
): Promise<PublicProduct[]> {
  if (props.source === "offers" || props.source === "collection") {
    return resolveProductGrid(props, {
      host: dataContext.host,
      tenantId: dataContext.tenantId,
      site: dataContext.site,
    } satisfies ResolverContext);
  }
  return selectFromBulk(dataContext.products, props.source, {
    categoryId: props.categoryId,
    productIds: props.productIds,
    limit: props.limit,
  });
}

function selectFromBulk(
  all: PublicProduct[],
  source: ProductGridProps["source"],
  opts: { categoryId?: string; productIds?: string[]; limit: number },
): PublicProduct[] {
  if (source === "manual" && opts.productIds && opts.productIds.length > 0) {
    const byId = new Map(all.map((p) => [p.id, p] as const));
    return opts.productIds
      .map((id) => byId.get(id))
      .filter((p): p is PublicProduct => !!p)
      .slice(0, opts.limit);
  }
  if (source === "category" && opts.categoryId) {
    return all
      .filter((p) => p.categoryId === opts.categoryId)
      .slice(0, opts.limit);
  }
  if (source === "on-sale") {
    return all
      .filter((p) => p.finalSp && p.mrp && Number(p.finalSp) < Number(p.mrp))
      .slice(0, opts.limit);
  }
  if (source === "newest") {
    return [...all]
      .sort(
        (a, b) =>
          new Date(b.dateCreated ?? 0).getTime() -
          new Date(a.dateCreated ?? 0).getTime(),
      )
      .slice(0, opts.limit);
  }
  if (source === "price-low") {
    return [...all]
      .sort((a, b) => Number(a.finalSp) - Number(b.finalSp))
      .slice(0, opts.limit);
  }
  if (source === "price-high") {
    return [...all]
      .sort((a, b) => Number(b.finalSp) - Number(a.finalSp))
      .slice(0, opts.limit);
  }
  return all.slice(0, opts.limit);
}
