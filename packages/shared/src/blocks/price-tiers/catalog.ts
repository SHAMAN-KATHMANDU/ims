import type { CatalogEntry } from "../types";

export const priceTiersCatalog: CatalogEntry<"price-tiers"> = {
  kind: "price-tiers",
  label: "Price tiers",
  description:
    "Volume / wholesale pricing table. Highlights the active tier based on cart qty.",
  category: "commerce",
  scopes: ["product-detail"],
  createDefaultProps: () => ({
    tiers: [
      { minQty: 1, maxQty: 9, price: 0, label: "Single" },
      { minQty: 10, maxQty: 49, price: 0, label: "Pack" },
      { minQty: 50, price: 0, label: "Wholesale" },
    ],
    highlightActive: true,
    heading: "Volume pricing",
  }),
};
