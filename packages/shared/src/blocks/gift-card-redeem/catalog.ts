import type { CatalogEntry } from "../types";

export const giftCardRedeemCatalog: CatalogEntry<"gift-card-redeem"> = {
  kind: "gift-card-redeem",
  label: "Gift card redeem",
  description: "Code input and balance checker.",
  category: "commerce",
  createDefaultProps: () => ({
    heading: "Redeem a gift card",
    subtitle: "Enter your code to apply.",
  }),
};
