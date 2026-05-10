import type { CatalogEntry } from "../types";

export const lookbookCatalog: CatalogEntry<"lookbook"> = {
  kind: "lookbook",
  label: "Lookbook",
  description: "Shoppable pinned image.",
  category: "pdp",
  createDefaultProps: () => ({
    aspectRatio: "4/5",
    scenes: [],
  }),
};
