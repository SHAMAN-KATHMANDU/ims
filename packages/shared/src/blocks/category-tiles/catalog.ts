import type { CatalogEntry } from "../types";

export const categoryTilesCatalog: CatalogEntry<"category-tiles"> = {
  kind: "category-tiles",
  label: "Category tiles",
  description: "Shop-by-category hero tiles.",
  category: "commerce",
  scopes: ["home"],
  createDefaultProps: () => ({
    heading: "Shop by category",
    columns: 3,
    aspectRatio: "4/5",
  }),
};
