import type { CatalogEntry } from "../types";

export const utilityBarCatalog: CatalogEntry<"utility-bar"> = {
  kind: "utility-bar",
  label: "Utility bar",
  description: "Top strip with small links.",
  category: "marketing",
  createDefaultProps: () => ({
    align: "between",
    items: [
      { label: "Free shipping", href: "" },
      { label: "Contact", href: "/contact" },
    ],
  }),
};
