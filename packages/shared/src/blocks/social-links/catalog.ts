import type { CatalogEntry } from "../types";

export const socialLinksCatalog: CatalogEntry<"social-links"> = {
  kind: "social-links",
  label: "Social links",
  description: "Instagram, Pinterest, TikTok, etc.",
  category: "marketing",
  createDefaultProps: () => ({
    variant: "text",
    align: "start",
    items: [
      { platform: "instagram", handle: "@brand", href: "" },
      { platform: "pinterest", handle: "brand", href: "" },
    ],
  }),
};
