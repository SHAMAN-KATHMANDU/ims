/**
 * product-filters block — sidebar facet widget.
 *
 * Renders collapsible filter groups for category, price, brand, and EAV
 * attributes. The server composes it alongside ProductListingBlock via a
 * `columns` container on /products; both read the same URL search params
 * so the pair stay in sync.
 *
 * The visible, interactive controls live in ProductFiltersClient so that
 * <select>/chip toggles can push router updates. The server block reads
 * `productFacets` + `categories` from dataContext and hands them down as
 * plain props — no fetches here.
 */

import type { ProductFiltersProps } from "@repo/shared";
import type { BlockComponentProps } from "../registry";
import { ProductFiltersClient } from "./ProductFiltersClient";

export function ProductFiltersBlock({
  props,
  dataContext,
}: BlockComponentProps<ProductFiltersProps>) {
  const facets = dataContext.productFacets;
  const categories = dataContext.categories ?? [];
  const show = props.show;
  const attrAllowlist = show.attributes ?? null;

  // Filter the attribute facets to those the admin picked (or all when
  // they left the array blank / absent). Hide groups with zero values
  // so empty-facet products don't render an empty heading.
  const attributes = (facets?.attributes ?? []).filter((a) => {
    if (a.values.length === 0) return false;
    if (!attrAllowlist || attrAllowlist.length === 0) return true;
    return attrAllowlist.includes(a.typeId);
  });

  return (
    <ProductFiltersClient
      heading={props.heading ?? "Filters"}
      stickyOffset={props.stickyOffset ?? 96}
      showCategory={show.category}
      showPriceRange={show.priceRange}
      showBrand={show.brand}
      categories={categories}
      brands={facets?.brands ?? []}
      priceMin={facets?.priceMin ?? null}
      priceMax={facets?.priceMax ?? null}
      attributes={attributes}
    />
  );
}
