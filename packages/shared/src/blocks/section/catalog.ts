import type { CatalogEntry } from "../types";

export const sectionCatalog: CatalogEntry<"section"> = {
  kind: "section",
  label: "Section",
  description: "Container with background + padding presets.",
  category: "layout",
  createDefaultProps: () => ({
    background: "default",
    paddingY: "balanced",
    maxWidth: "default",
  }),
};
