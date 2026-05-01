import type { CatalogEntry } from "../types";

export const cssGridCatalog: CatalogEntry<"css-grid"> = {
  kind: "css-grid",
  label: "CSS Grid",
  description: "Advanced N-column grid layout (1–12 cols). Container block.",
  category: "layout",
  createDefaultProps: () => ({
    columns: 3,
    gap: "md",
  }),
};
