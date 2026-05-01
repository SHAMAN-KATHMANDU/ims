import type { CatalogEntry } from "../types";

export const headingCatalog: CatalogEntry<"heading"> = {
  kind: "heading",
  label: "Heading",
  description: "h1..h4 with optional eyebrow + subtitle.",
  category: "content",
  createDefaultProps: () => ({
    text: "Heading",
    level: 2,
    alignment: "center",
  }),
};
