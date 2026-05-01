import type { CatalogEntry } from "../types";

export const customHtmlCatalog: CatalogEntry<"custom-html"> = {
  kind: "custom-html",
  label: "Custom HTML",
  description:
    "Write raw HTML and optional CSS. Full control — use for embeds, custom widgets, or anything the preset blocks don't cover.",
  category: "content",
  createDefaultProps: () => ({
    html: "<p>Your custom HTML here</p>",
    css: "",
  }),
};
