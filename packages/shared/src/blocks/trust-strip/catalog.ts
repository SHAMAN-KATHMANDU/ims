import type { CatalogEntry } from "../types";

export const trustStripCatalog: CatalogEntry<"trust-strip"> = {
  kind: "trust-strip",
  label: "Trust strip",
  description: "Value-prop strip (shipping, returns, support).",
  category: "marketing",
  createDefaultProps: () => ({
    items: [
      { label: "Shipping", value: "Free over ₹5k" },
      { label: "Returns", value: "30 days" },
      { label: "Support", value: "Mon–Sat" },
    ],
  }),
};
