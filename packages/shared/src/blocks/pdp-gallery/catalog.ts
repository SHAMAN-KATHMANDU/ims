import type { CatalogEntry } from "../types";

export const pdpGalleryCatalog: CatalogEntry<"pdp-gallery"> = {
  kind: "pdp-gallery",
  label: "PDP gallery",
  description: "Product photo gallery with zoom.",
  category: "pdp",
  scopes: ["product-detail"],
  createDefaultProps: () => ({ layout: "thumbs-below", enableZoom: true }),
};
