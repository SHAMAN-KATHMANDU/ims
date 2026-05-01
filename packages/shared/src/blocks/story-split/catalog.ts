import type { CatalogEntry } from "../types";

export const storySplitCatalog: CatalogEntry<"story-split"> = {
  kind: "story-split",
  label: "Story split",
  description: "Side-by-side image + narrative.",
  category: "marketing",
  createDefaultProps: () => ({
    eyebrow: "Our story",
    title: "Crafted with intention",
    body: "Every piece is made by hand by artisans we've worked with for years.",
    imageSide: "left",
  }),
};
