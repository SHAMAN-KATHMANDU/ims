import type { CatalogEntry } from "../types";

export const snippetRefCatalog: CatalogEntry<"snippet-ref"> = {
  kind: "snippet-ref",
  label: "Snippet",
  description:
    "Insert a saved Snippet — edit it once and it updates everywhere it's referenced.",
  category: "content",
  createDefaultProps: () => ({
    snippetId: "",
  }),
};
