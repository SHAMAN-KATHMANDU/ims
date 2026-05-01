import type { CatalogEntry } from "../types";

export const statsBandCatalog: CatalogEntry<"stats-band"> = {
  kind: "stats-band",
  label: "Stats band",
  description: "Numeric stat strip.",
  category: "marketing",
  createDefaultProps: () => ({
    items: [
      { value: "10 yrs", label: "Crafting" },
      { value: "30+", label: "Artisans" },
      { value: "5k", label: "Customers" },
    ],
  }),
};
