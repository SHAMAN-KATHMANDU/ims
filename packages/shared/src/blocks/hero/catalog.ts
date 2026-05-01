import type { CatalogEntry } from "../types";

export const heroCatalog: CatalogEntry<"hero"> = {
  kind: "hero",
  label: "Hero",
  description: "Top-of-page brand hero with CTA.",
  category: "commerce",
  scopes: ["home"],
  createDefaultProps: () => ({
    variant: "editorial",
    ctaLabel: "Shop the collection",
    ctaHref: "/products",
  }),
};
