import type { CatalogEntry } from "../types";

export const reviewsListCatalog: CatalogEntry<"reviews-list"> = {
  kind: "reviews-list",
  label: "Reviews list",
  description: "Customer reviews with ratings.",
  category: "pdp",
  scopes: ["product-detail"],
  createDefaultProps: () => ({
    heading: "Customer reviews",
  }),
};
