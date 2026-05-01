import type { CatalogEntry } from "../types";

export const productGridCatalog: CatalogEntry<"product-grid"> = {
  kind: "product-grid",
  label: "Product grid",
  description: "Featured / category / manual product grid.",
  category: "commerce",
  scopes: ["home", "product-detail"],
  createDefaultProps: () => ({
    source: "featured",
    limit: 8,
    columns: 4,
    cardVariant: "bordered",
    heading: "Featured",
  }),
};

export const productGridNewArrivalsCatalog: CatalogEntry<"product-grid"> = {
  id: "product-grid-new-arrivals",
  kind: "product-grid",
  label: "New Arrivals",
  description: "Latest products, sorted by date added.",
  category: "commerce",
  scopes: ["home"],
  createDefaultProps: () => ({
    source: "newest",
    limit: 8,
    columns: 4,
    cardVariant: "bordered",
    heading: "New Arrivals",
    eyebrow: "Just in",
  }),
};

export const productGridHotDealsCatalog: CatalogEntry<"product-grid"> = {
  id: "product-grid-hot-deals",
  kind: "product-grid",
  label: "Hot Deals",
  description: "Products currently on sale (discounted).",
  category: "commerce",
  scopes: ["home"],
  createDefaultProps: () => ({
    source: "on-sale",
    limit: 8,
    columns: 4,
    cardVariant: "bordered",
    heading: "Hot Deals",
    eyebrow: "Limited time offers",
  }),
};

export const productGridStaffPicksCatalog: CatalogEntry<"product-grid"> = {
  id: "product-grid-staff-picks",
  kind: "product-grid",
  label: "Staff Picks",
  description: "Hand-picked products — select from your catalog.",
  category: "commerce",
  scopes: ["home"],
  createDefaultProps: () => ({
    source: "manual",
    limit: 8,
    columns: 4,
    cardVariant: "card",
    heading: "Staff Picks",
    eyebrow: "Curated for you",
    productIds: [],
  }),
};

export const productGridTrendingCatalog: CatalogEntry<"product-grid"> = {
  id: "product-grid-trending",
  kind: "product-grid",
  label: "Trending Products",
  description: "Hand-picked trending products for the homepage.",
  category: "commerce",
  scopes: ["home"],
  createDefaultProps: () => ({
    source: "manual",
    limit: 6,
    columns: 3,
    cardVariant: "bordered",
    heading: "Trending Now",
    eyebrow: "Popular picks",
    productIds: [],
  }),
};
