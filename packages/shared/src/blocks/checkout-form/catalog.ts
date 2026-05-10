import type { CatalogEntry } from "../types";

export const checkoutFormCatalog: CatalogEntry<"checkout-form"> = {
  kind: "checkout-form",
  label: "Checkout form",
  description:
    "Guest checkout form with customer info, cart review, and order submission.",
  category: "commerce",
  scopes: ["cart"] as const,
  createDefaultProps: () => ({
    showOrderSummary: true,
    submitButtonLabel: "Place order",
  }),
};
