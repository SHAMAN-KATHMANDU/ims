import type { CatalogEntry } from "../types";

export const emptyStateCatalog: CatalogEntry<"empty-state"> = {
  kind: "empty-state",
  label: "Empty state",
  description: "Placeholder for not-found / no-results.",
  category: "content",
  createDefaultProps: () => ({
    kind: "generic",
    heading: "Nothing here yet",
    subtitle: "Add content to bring this page to life.",
    illustration: "package",
    ctaLabel: "Go home",
    ctaHref: "/",
  }),
};
