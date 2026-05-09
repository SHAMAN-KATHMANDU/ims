import {
  BLOCK_CATALOG_ENTRIES,
  type CatalogEntry,
  type BlockKind,
} from "@repo/shared";

const KIND_TO_GROUP: Partial<Record<BlockKind, string>> = {
  // Text
  heading: "Text",
  button: "Text",
  "rich-text": "Text",
  "markdown-body": "Text",
  divider: "Text",
  spacer: "Text",
  breadcrumbs: "Text",
  // Media
  image: "Media",
  video: "Media",
  embed: "Media",
  gallery: "Media",
  // Marketing
  hero: "Marketing",
  newsletter: "Marketing",
  "announcement-bar": "Marketing",
  "stats-band": "Marketing",
  testimonials: "Marketing",
  "trust-strip": "Marketing",
  "payment-icons": "Marketing",
  "logo-cloud": "Marketing",
  "logo-mark": "Marketing",
  "story-split": "Marketing",
  "bento-showcase": "Marketing",
  "contact-block": "Marketing",
  faq: "Marketing",
  "policy-strip": "Marketing",
  // Commerce
  "product-grid": "Commerce",
  "product-listing": "Commerce",
  "product-filters": "Commerce",
  "product-comparison": "Commerce",
  "category-tiles": "Commerce",
  "collection-cards": "Commerce",
  "bundle-spotlight": "Commerce",
  "recently-viewed": "Commerce",
  lookbook: "Commerce",
  "price-tiers": "Commerce",
  "cart-line-items": "Commerce",
  "order-summary": "Commerce",
  "gift-card-redeem": "Commerce",
  // PDP
  "pdp-buybox": "PDP",
  "pdp-gallery": "PDP",
  "pdp-related": "PDP",
  "pdp-details": "PDP",
  "size-guide": "PDP",
  "reviews-list": "PDP",
  "snippet-ref": "PDP",
  fbt: "PDP",
  // Forms
  form: "Forms",
  // Header & Footer
  "nav-bar": "Header & Footer",
  "footer-columns": "Header & Footer",
  "utility-bar": "Header & Footer",
  "account-bar": "Header & Footer",
  "copyright-bar": "Header & Footer",
  "social-links": "Header & Footer",
  // Layout
  section: "Layout",
  row: "Layout",
  columns: "Layout",
  "css-grid": "Layout",
  accordion: "Layout",
  tabs: "Layout",
  "blog-list": "Layout",
  "empty-state": "Layout",
  // Developer
  "custom-html": "Developer",
};

const GROUP_ORDER = [
  "Text",
  "Media",
  "Marketing",
  "Commerce",
  "PDP",
  "Forms",
  "Layout",
  "Header & Footer",
  "Developer",
];

export interface GroupedCatalog {
  group: string;
  entries: CatalogEntry[];
}

export const GROUPED_CATALOG: GroupedCatalog[] = (() => {
  const buckets = new Map<string, CatalogEntry[]>();
  for (const entry of BLOCK_CATALOG_ENTRIES) {
    const group = KIND_TO_GROUP[entry.kind] ?? "Other";
    if (!buckets.has(group)) buckets.set(group, []);
    buckets.get(group)!.push(entry);
  }
  return GROUP_ORDER.map((g) => ({ group: g, entries: buckets.get(g) ?? [] }))
    .filter((g) => g.entries.length > 0)
    .concat(
      buckets.has("Other")
        ? [{ group: "Other", entries: buckets.get("Other")! }]
        : [],
    );
})();
