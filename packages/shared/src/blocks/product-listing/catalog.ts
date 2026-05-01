import type { CatalogEntry } from "../types";

export const productListingCatalog: CatalogEntry<"product-listing"> = {
  kind: "product-listing",
  label: "Product listing",
  description: "Paginated product grid w/ sort + filters.",
  category: "commerce",
  scopes: ["products-index"],
  createDefaultProps: () => ({
    pageSize: 24,
    defaultSort: "newest",
    showSort: true,
    columns: 4,
    categoryFilter: true,
    // Explicit optional defaults so a freshly-added block renders the same
    // in the preview as it does after the user toggles every inspector control.
    showPrice: true,
    showCategory: true,
    showDiscount: true,
    cardAspectRatio: "1/1",
  }),
};
