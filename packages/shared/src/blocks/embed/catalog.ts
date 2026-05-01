import type { CatalogEntry } from "../types";

export const embedCatalog: CatalogEntry<"embed"> = {
  kind: "embed",
  label: "Embed / iframe",
  description: "Calendly, Google Forms, or any URL.",
  category: "content",
  createDefaultProps: () => ({
    src: "https://example.com",
    aspectRatio: "16/9",
    allowFullscreen: true,
  }),
};
