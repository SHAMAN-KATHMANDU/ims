import type { CatalogEntry } from "../types";

export const paymentIconsCatalog: CatalogEntry<"payment-icons"> = {
  kind: "payment-icons",
  label: "Payment icons",
  description: "Visa, MC, PayPal, Apple Pay, etc.",
  category: "marketing",
  createDefaultProps: () => ({
    align: "end",
    variant: "flat",
    items: [
      { name: "Visa" },
      { name: "Mastercard" },
      { name: "Amex" },
      { name: "PayPal" },
    ],
  }),
};
