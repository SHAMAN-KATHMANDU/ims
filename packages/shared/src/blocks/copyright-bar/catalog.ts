import type { CatalogEntry } from "../types";

export const copyrightBarCatalog: CatalogEntry<"copyright-bar"> = {
  kind: "copyright-bar",
  label: "Copyright bar",
  description: "Bottom © line + links.",
  category: "marketing",
  scopes: ["footer"] as const,
  createDefaultProps: () => ({
    copy: "© 2026. All rights reserved.",
    showLinks: true,
    items: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  }),
};
