import type { CatalogEntry } from "../types";

export const tabsCatalog: CatalogEntry<"tabs"> = {
  kind: "tabs",
  label: "Tabs",
  description: "Tabbed content panels.",
  category: "content",
  createDefaultProps: () => ({
    tabs: [
      { label: "Tab 1", content: "Content for tab 1." },
      { label: "Tab 2", content: "Content for tab 2." },
    ],
  }),
};
