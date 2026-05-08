import type { CatalogEntry } from "../types";

export const announcementBarCatalog: CatalogEntry<"announcement-bar"> = {
  kind: "announcement-bar",
  label: "Announcement bar",
  description:
    "Top-of-page strip (shipping, launch, promo) — static or scrolling marquee.",
  category: "marketing",
  scopes: ["header"] as const,
  createDefaultProps: () => ({
    text: "Free shipping across Nepal · Cash on delivery available",
    marquee: true,
    tone: "default",
    items: [
      "Free shipping across Nepal",
      "Cash on delivery",
      "Authentic brands only",
      "Scheduled delivery",
    ],
  }),
};
