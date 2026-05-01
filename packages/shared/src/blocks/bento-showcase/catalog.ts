import type { CatalogEntry } from "../types";

export const bentoShowcaseCatalog: CatalogEntry<"bento-showcase"> = {
  kind: "bento-showcase",
  label: "Bento showcase",
  description: "Asymmetric featured-product grid.",
  category: "marketing",
  scopes: ["home"],
  createDefaultProps: () => ({
    source: "featured",
    limit: 5,
    heading: "Featured",
  }),
};
