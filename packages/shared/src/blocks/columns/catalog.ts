import type { CatalogEntry } from "../types";

export const columnsCatalog: CatalogEntry<"columns"> = {
  kind: "columns",
  label: "Columns",
  description: "2, 3, or 4-column layout for side-by-side content.",
  category: "layout",
  createDefaultProps: () => ({
    count: 2,
    gap: "md",
    verticalAlign: "start",
  }),
};
