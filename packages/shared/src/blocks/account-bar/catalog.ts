import type { CatalogEntry } from "../types";

export const accountBarCatalog: CatalogEntry<"account-bar"> = {
  kind: "account-bar",
  label: "Account bar",
  description:
    "Slim B2B bar with account number, tier badge, and PO reference. Hides for guests unless guest copy is set.",
  category: "commerce",
  createDefaultProps: () => ({
    showAccountNumber: true,
    showTier: true,
    showPo: true,
    alignment: "between",
    tone: "default",
  }),
};
