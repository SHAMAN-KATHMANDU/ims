import type { CatalogEntry } from "../types";

export const bundleSpotlightCatalog: CatalogEntry<"bundle-spotlight"> = {
  kind: "bundle-spotlight",
  label: "Bundle spotlight",
  description: "Featured product bundle with discount highlight.",
  category: "commerce",
  createDefaultProps: () => ({
    slug: "",
    heading: "Special bundle",
    layout: "split",
  }),
};
