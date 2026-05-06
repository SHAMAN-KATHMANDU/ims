import type { CatalogEntry } from "../types";

export const cartLineItemsCatalog: CatalogEntry<"cart-line-items"> = {
  kind: "cart-line-items",
  label: "Cart line items",
  description:
    "List of products currently in the cart with thumbnail, qty controls, and price.",
  category: "commerce",
  scopes: ["cart"],
  createDefaultProps: () => ({
    showVariants: true,
    showRemove: true,
    qtyControls: "stepper",
    emptyStateText: "Your cart is empty.",
    thumbnailAspect: "1/1",
  }),
};
