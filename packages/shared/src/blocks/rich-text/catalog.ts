import type { CatalogEntry } from "../types";

export const richTextCatalog: CatalogEntry<"rich-text"> = {
  kind: "rich-text",
  label: "Rich text",
  description: "Markdown body.",
  category: "content",
  createDefaultProps: () => ({
    source: "Write something here…",
    maxWidth: "default",
  }),
};
