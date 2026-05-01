import type { CatalogEntry } from "../types";

export const newsletterCatalog: CatalogEntry<"newsletter"> = {
  kind: "newsletter",
  label: "Newsletter",
  description: "Email capture band.",
  category: "marketing",
  createDefaultProps: () => ({
    title: "Stay in the loop",
    subtitle: "Occasional updates — no spam.",
    cta: "Subscribe",
  }),
};
