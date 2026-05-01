import type { CatalogEntry } from "../types";

export const breadcrumbsCatalog: CatalogEntry<"breadcrumbs"> = {
  kind: "breadcrumbs",
  label: "Breadcrumbs",
  description: "Navigation trail.",
  category: "pdp",
  scopes: ["product-detail"],
  createDefaultProps: () => ({ scope: "product" }),
};
