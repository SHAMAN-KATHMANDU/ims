import type { CatalogEntry } from "../types";

export const pdpRelatedCatalog: CatalogEntry<"pdp-related"> = {
  kind: "pdp-related",
  label: "PDP related",
  description: "You may also like.",
  category: "pdp",
  scopes: ["product-detail"],
  createDefaultProps: () => ({
    heading: "You may also like",
    limit: 4,
    columns: 4,
  }),
};
