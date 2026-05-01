import type { CatalogEntry } from "../types";

export const sizeGuideCatalog: CatalogEntry<"size-guide"> = {
  kind: "size-guide",
  label: "Size guide",
  description: "Sizing info table.",
  category: "pdp",
  scopes: ["product-detail"],
  createDefaultProps: () => ({
    columns: ["XS", "S", "M", "L", "XL"],
    rows: [{ label: "Chest (cm)", values: ["80", "85", "90", "95", "100"] }],
    variant: "modal",
    triggerLabel: "Size guide",
    note: "All measurements in cm.",
  }),
};
