import type { CatalogEntry } from "../types";

export const buttonCatalog: CatalogEntry<"button"> = {
  kind: "button",
  label: "Button",
  description: "CTA link styled as primary / outline / ghost.",
  category: "content",
  createDefaultProps: () => ({
    label: "Shop now",
    href: "/products",
    style: "primary",
    size: "md",
    alignment: "center",
  }),
};
