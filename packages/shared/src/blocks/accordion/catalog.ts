import type { CatalogEntry } from "../types";

export const accordionCatalog: CatalogEntry<"accordion"> = {
  kind: "accordion",
  label: "Accordion",
  description: "Collapsible content sections.",
  category: "content",
  createDefaultProps: () => ({
    items: [
      { title: "Section 1", body: "Content for section 1." },
      { title: "Section 2", body: "Content for section 2." },
    ],
    allowMultiple: true,
  }),
};
