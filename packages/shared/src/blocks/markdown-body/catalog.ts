import type { CatalogEntry } from "../types";

export const markdownBodyCatalog: CatalogEntry<"markdown-body"> = {
  kind: "markdown-body",
  label: "Markdown body",
  description: "Legacy markdown block.",
  category: "content",
  scopes: ["page"],
  createDefaultProps: () => ({
    source: "# Welcome\n\nWrite your story here…",
    maxWidth: "default",
  }),
};
