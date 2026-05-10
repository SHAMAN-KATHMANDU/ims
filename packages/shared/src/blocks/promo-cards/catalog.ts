import type { CatalogEntry } from "../types";

export const promoCardsCatalog: CatalogEntry<"promo-cards"> = {
  kind: "promo-cards",
  label: "Promo cards",
  description:
    "Grid of the tenant's currently-active promo codes — code, value, and validity date.",
  category: "marketing",
  scopes: ["home", "offers", "page"] as const,
  createDefaultProps: () => ({
    heading: "Active offers",
    subtitle: "Apply at checkout — limited time only.",
    showCode: true,
    showValue: true,
    limit: 12,
    layout: "grid",
    columns: 3,
  }),
};
