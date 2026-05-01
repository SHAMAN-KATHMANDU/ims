import type { CatalogEntry } from "../types";

export const footerColumnsCatalog: CatalogEntry<"footer-columns"> = {
  kind: "footer-columns",
  label: "Footer columns",
  description: "2–6 link columns + brand.",
  category: "marketing",
  createDefaultProps: () => ({
    showBrand: true,
    brand: "Brand",
    tagline: "Company tagline.",
    columns: [
      {
        title: "Shop",
        links: [
          { label: "All", href: "/products" },
          { label: "New", href: "/products?sort=new" },
        ],
      },
      {
        title: "Help",
        links: [
          { label: "Contact", href: "/contact" },
          { label: "FAQ", href: "/faq" },
        ],
      },
    ],
  }),
};
