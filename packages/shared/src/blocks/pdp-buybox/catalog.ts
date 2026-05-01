import type { CatalogEntry } from "../types";

export const pdpBuyboxCatalog: CatalogEntry<"pdp-buybox"> = {
  kind: "pdp-buybox",
  label: "PDP buybox",
  description: "Name, price, variant picker (chips), quantity, Add to Cart.",
  category: "pdp",
  scopes: ["product-detail"],
  createDefaultProps: () => ({
    showSku: true,
    showCategory: true,
    showVariantPicker: true,
    variantDisplay: "chips" as const,
  }),
};
