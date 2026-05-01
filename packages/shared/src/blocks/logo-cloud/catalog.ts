import type { CatalogEntry } from "../types";

export const logoCloudCatalog: CatalogEntry<"logo-cloud"> = {
  kind: "logo-cloud",
  label: "Logo cloud",
  description: "Press / partners grid.",
  category: "marketing",
  createDefaultProps: () => ({
    heading: "As seen in",
    logos: [],
  }),
};
