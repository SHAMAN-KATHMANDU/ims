import type { CatalogEntry } from "../types";

export const rowCatalog: CatalogEntry<"row"> = {
  kind: "row",
  label: "Row",
  description:
    "Flexible horizontal row — place any blocks side by side. Wrapping, gap, and alignment fully configurable.",
  category: "layout",
  createDefaultProps: () => ({
    gap: "md",
    wrap: true,
    align: "start",
  }),
};
