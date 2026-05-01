import type { CatalogEntry } from "../types";

export const blogListCatalog: CatalogEntry<"blog-list"> = {
  kind: "blog-list",
  label: "Blog list",
  description: "Featured blog posts.",
  category: "blog",
  scopes: ["home"],
  createDefaultProps: () => ({
    heading: "From the journal",
    limit: 3,
    columns: 3,
  }),
};
