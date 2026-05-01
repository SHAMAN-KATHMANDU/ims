import type { CatalogEntry } from "../types";

export const productComparisonCatalog: CatalogEntry<"product-comparison"> = {
  kind: "product-comparison",
  label: "Product comparison",
  description: "Compare 2–4 products side-by-side.",
  category: "pdp",
  createDefaultProps: () => ({
    heading: "Compare",
    description: "",
    productIds: [],
    attributes: ["price", "category"],
  }),
};
