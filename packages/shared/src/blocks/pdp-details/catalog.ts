import type { CatalogEntry } from "../types";

export const pdpDetailsCatalog: CatalogEntry<"pdp-details"> = {
  kind: "pdp-details",
  label: "PDP details",
  description: "Product description block.",
  category: "pdp",
  scopes: ["product-detail"],
  createDefaultProps: () => ({ tabs: false }),
};
