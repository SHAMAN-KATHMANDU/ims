import type { CatalogEntry } from "../types";

export const productFiltersCatalog: CatalogEntry<"product-filters"> = {
  kind: "product-filters",
  label: "Product filters",
  description:
    "Sidebar with category / price / brand / attribute facets. Pair with a product-listing block inside a columns container on the products page.",
  category: "commerce",
  scopes: ["products-index"],
  createDefaultProps: () => ({
    heading: "Filters",
    show: {
      category: true,
      priceRange: true,
      brand: true,
    },
    stickyOffset: 96,
  }),
};
