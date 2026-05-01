import type { CatalogEntry } from "../types";

export const dividerCatalog: CatalogEntry<"divider"> = {
  kind: "divider",
  label: "Divider",
  description: "Horizontal rule.",
  category: "layout",
  createDefaultProps: () => ({ variant: "line" }),
};
