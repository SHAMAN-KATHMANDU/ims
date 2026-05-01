import type { CatalogEntry } from "../types";

export const logoMarkCatalog: CatalogEntry<"logo-mark"> = {
  kind: "logo-mark",
  label: "Logo mark",
  description: "Standalone brand mark.",
  category: "marketing",
  createDefaultProps: () => ({
    brand: "Brand",
    subtitle: "Tagline",
    href: "/",
    align: "center",
    variant: "text-only",
  }),
};
