import type { CatalogEntry } from "../types";

export const collectionCardsCatalog: CatalogEntry<"collection-cards"> = {
  kind: "collection-cards",
  label: "Collection cards",
  description:
    '2–4 big image-text cards linking to collections / categories (e.g. "Elevare Favourites").',
  category: "marketing",
  createDefaultProps: () => ({
    heading: "Shop by collection",
    aspectRatio: "portrait",
    overlay: true,
    cards: [
      {
        title: "Featured",
        subtitle: "Our editor's picks this season",
        ctaLabel: "Shop featured",
        ctaHref: "/collections/featured",
      },
      {
        title: "Exclusives",
        subtitle: "Only here — nowhere else",
        ctaLabel: "Shop exclusives",
        ctaHref: "/collections/exclusives",
      },
    ],
  }),
};
