import type { CatalogEntry } from "../types";

export const orderSummaryCatalog: CatalogEntry<"order-summary"> = {
  kind: "order-summary",
  label: "Order summary",
  description:
    "Cart totals, promo code, shipping estimator, and the checkout CTA.",
  category: "commerce",
  scopes: ["cart"],
  createDefaultProps: () => ({
    position: "right",
    showPromoCode: true,
    showShippingEstimator: false,
    showTrustBadges: true,
    checkoutLabel: "Checkout",
    heading: "Summary",
  }),
};
