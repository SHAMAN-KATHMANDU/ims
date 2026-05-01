import type { CatalogEntry } from "../types";

export const imageCatalog: CatalogEntry<"image"> = {
  kind: "image",
  label: "Image",
  description: "Responsive image with optional caption.",
  category: "content",
  createDefaultProps: () => ({
    src: "https://picsum.photos/1200/800",
    alt: "Image",
    aspectRatio: "16/9",
    rounded: true,
  }),
};
