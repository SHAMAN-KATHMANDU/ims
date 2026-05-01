import type { CatalogEntry } from "../types";

export const galleryCatalog: CatalogEntry<"gallery"> = {
  kind: "gallery",
  label: "Image gallery",
  description: "Grid, masonry, or slideshow with optional lightbox.",
  category: "content",
  createDefaultProps: () => ({
    images: [],
    layout: "grid",
    columns: 3,
    lightbox: true,
  }),
};
