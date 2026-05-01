import type { CatalogEntry } from "../types";

export const spacerCatalog: CatalogEntry<"spacer"> = {
  kind: "spacer",
  label: "Spacer",
  description: "Vertical whitespace.",
  category: "layout",
  createDefaultProps: () => ({ size: "md" }),
};
