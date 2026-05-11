import type { CatalogEntry } from "../types";

export const collectionCardsCatalog: CatalogEntry<"collection-cards"> = {
  kind: "collection-cards",
  label: "Collection cards",
  description:
    '2–4 big image-text cards linking to collections / categories (e.g. "Elevare Favourites").',
  category: "marketing",
  createDefaultProps: () => ({
    // Default to auto so a fresh template-applied storefront renders the
    // tenant's real collections immediately. Tenants who want a curated
    // mix can flip source to "manual" in the inspector.
    source: "auto",
    limit: 4,
    heading: "Shop by collection",
    aspectRatio: "portrait",
    overlay: true,
    cards: [],
  }),
};
