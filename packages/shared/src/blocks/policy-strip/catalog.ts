import type { CatalogEntry } from "../types";

export const policyStripCatalog: CatalogEntry<"policy-strip"> = {
  kind: "policy-strip",
  label: "Policy strip",
  description: "Shipping / returns / trust icons.",
  category: "marketing",
  createDefaultProps: () => ({
    items: [
      { label: "Free shipping" },
      { label: "30-day returns" },
      { label: "Secure checkout" },
    ],
  }),
};
