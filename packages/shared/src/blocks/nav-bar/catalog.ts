import type { CatalogEntry } from "../types";

export const navBarCatalog: CatalogEntry<"nav-bar"> = {
  kind: "nav-bar",
  label: "Nav bar",
  description: "Logo · menu · search · cart (header global).",
  category: "marketing",
  createDefaultProps: () => ({
    brand: "Brand",
    brandHref: "/",
    showSearch: true,
    showCart: true,
    showAccount: false,
    sticky: true,
    variant: "standard",
    align: "between",
    items: [
      { label: "Shop", href: "/products" },
      { label: "About", href: "/about" },
    ],
  }),
};
