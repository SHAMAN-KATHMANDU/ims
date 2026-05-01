import type { CatalogEntry } from "../types";

export const recentlyViewedCatalog: CatalogEntry<"recently-viewed"> = {
  kind: "recently-viewed",
  label: "Recently viewed",
  description: "Browsing history carousel.",
  category: "pdp",
  scopes: ["product-detail"],
  createDefaultProps: () => ({
    heading: "Recently viewed",
    maxItems: 6,
  }),
};
