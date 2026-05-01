import type { CatalogEntry } from "../types";

export const fbtCatalog: CatalogEntry<"fbt"> = {
  kind: "fbt",
  label: "Frequently Bought Together",
  description: "Bundle of related products.",
  category: "pdp",
  scopes: ["product-detail"],
  createDefaultProps: () => ({
    heading: "Frequently Bought Together",
  }),
};
