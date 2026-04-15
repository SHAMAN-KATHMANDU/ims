/**
 * Block catalog — metadata + default prop factories for every BlockKind
 * the editor can insert. Grouped by category so the palette can render
 * sensible sections.
 *
 * Keeping catalog + factories in one place means adding a new block kind
 * is a single-file touch in the editor after it lands in @repo/shared +
 * the tenant-site registry.
 */

import type { BlockKind, BlockNode, BlockPropsMap } from "@repo/shared";

export type CatalogCategory =
  | "layout"
  | "content"
  | "commerce"
  | "marketing"
  | "blog"
  | "pdp";

export interface CatalogEntry<K extends BlockKind = BlockKind> {
  kind: K;
  label: string;
  description: string;
  category: CatalogCategory;
  /** Scopes this block makes sense on. Empty = any scope. */
  scopes?: Array<"home" | "products-index" | "product-detail" | "page">;
  /** Produces fresh props for a new instance of this block. */
  createDefaultProps: () => BlockPropsMap[K];
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export const BLOCK_CATALOG: CatalogEntry[] = [
  // Layout / structural
  {
    kind: "section",
    label: "Section",
    description: "Container with background + padding presets.",
    category: "layout",
    createDefaultProps: () => ({
      background: "default",
      paddingY: "balanced",
      maxWidth: "default",
    }),
  },
  {
    kind: "spacer",
    label: "Spacer",
    description: "Vertical whitespace.",
    category: "layout",
    createDefaultProps: () => ({ size: "md" }),
  },
  {
    kind: "divider",
    label: "Divider",
    description: "Horizontal rule.",
    category: "layout",
    createDefaultProps: () => ({ variant: "line" }),
  },

  // Content
  {
    kind: "heading",
    label: "Heading",
    description: "h1..h4 with optional eyebrow + subtitle.",
    category: "content",
    createDefaultProps: () => ({
      text: "Heading",
      level: 2,
      alignment: "center",
    }),
  },
  {
    kind: "rich-text",
    label: "Rich text",
    description: "Markdown body.",
    category: "content",
    createDefaultProps: () => ({
      source: "Write something here…",
      maxWidth: "default",
    }),
  },
  {
    kind: "image",
    label: "Image",
    description: "Responsive image with optional caption.",
    category: "content",
    createDefaultProps: () => ({
      src: "https://picsum.photos/1200/800",
      alt: "Image",
      aspectRatio: "16/9",
      rounded: true,
    }),
  },
  {
    kind: "button",
    label: "Button",
    description: "CTA link styled as primary / outline / ghost.",
    category: "content",
    createDefaultProps: () => ({
      label: "Shop now",
      href: "/products",
      style: "primary",
      size: "md",
      alignment: "center",
    }),
  },
  {
    kind: "markdown-body",
    label: "Markdown body",
    description: "Legacy markdown block.",
    category: "content",
    scopes: ["page"],
    createDefaultProps: () => ({
      source: "# Welcome\n\nWrite your story here…",
      maxWidth: "default",
    }),
  },

  // Commerce
  {
    kind: "hero",
    label: "Hero",
    description: "Top-of-page brand hero with CTA.",
    category: "commerce",
    scopes: ["home"],
    createDefaultProps: () => ({
      variant: "editorial",
      ctaLabel: "Shop the collection",
      ctaHref: "/products",
    }),
  },
  {
    kind: "product-grid",
    label: "Product grid",
    description: "Featured / category / manual product grid.",
    category: "commerce",
    scopes: ["home", "product-detail"],
    createDefaultProps: () => ({
      source: "featured",
      limit: 8,
      columns: 4,
      cardVariant: "bordered",
      heading: "Featured",
    }),
  },
  {
    kind: "category-tiles",
    label: "Category tiles",
    description: "Shop-by-category hero tiles.",
    category: "commerce",
    scopes: ["home"],
    createDefaultProps: () => ({
      heading: "Shop by category",
      columns: 3,
      aspectRatio: "4/5",
    }),
  },
  {
    kind: "product-listing",
    label: "Product listing",
    description: "Paginated product grid w/ sort + filters.",
    category: "commerce",
    scopes: ["products-index"],
    createDefaultProps: () => ({
      pageSize: 24,
      defaultSort: "newest",
      showSort: true,
      columns: 4,
      categoryFilter: true,
    }),
  },

  // Marketing
  {
    kind: "trust-strip",
    label: "Trust strip",
    description: "Value-prop strip (shipping, returns, support).",
    category: "marketing",
    createDefaultProps: () => ({
      items: [
        { label: "Shipping", value: "Free over ₹5k" },
        { label: "Returns", value: "30 days" },
        { label: "Support", value: "Mon–Sat" },
      ],
    }),
  },
  {
    kind: "story-split",
    label: "Story split",
    description: "Side-by-side image + narrative.",
    category: "marketing",
    createDefaultProps: () => ({
      eyebrow: "Our story",
      title: "Crafted with intention",
      body: "Every piece is made by hand by artisans we've worked with for years.",
      imageSide: "left",
    }),
  },
  {
    kind: "bento-showcase",
    label: "Bento showcase",
    description: "Asymmetric featured-product grid.",
    category: "marketing",
    scopes: ["home"],
    createDefaultProps: () => ({
      source: "featured",
      limit: 5,
      heading: "Featured",
    }),
  },
  {
    kind: "stats-band",
    label: "Stats band",
    description: "Numeric stat strip.",
    category: "marketing",
    createDefaultProps: () => ({
      items: [
        { value: "10 yrs", label: "Crafting" },
        { value: "30+", label: "Artisans" },
        { value: "5k", label: "Customers" },
      ],
    }),
  },
  {
    kind: "newsletter",
    label: "Newsletter",
    description: "Email capture band.",
    category: "marketing",
    createDefaultProps: () => ({
      title: "Stay in the loop",
      subtitle: "Occasional updates — no spam.",
      cta: "Subscribe",
    }),
  },
  {
    kind: "contact-block",
    label: "Contact info",
    description: "Email / phone / address.",
    category: "marketing",
    createDefaultProps: () => ({ heading: "Get in touch" }),
  },
  {
    kind: "faq",
    label: "FAQ",
    description: "Accordion of questions + answers.",
    category: "marketing",
    createDefaultProps: () => ({
      heading: "Questions, answered",
      items: [
        { question: "Do you ship internationally?", answer: "Yes." },
        {
          question: "What's your return policy?",
          answer: "30 days, no hassle.",
        },
      ],
    }),
  },
  {
    kind: "testimonials",
    label: "Testimonials",
    description: "Customer quote cards.",
    category: "marketing",
    createDefaultProps: () => ({
      heading: "What people say",
      items: [
        { quote: "Loved it.", author: "Someone", role: "Happy customer" },
      ],
    }),
  },
  {
    kind: "logo-cloud",
    label: "Logo cloud",
    description: "Press / partners grid.",
    category: "marketing",
    createDefaultProps: () => ({
      heading: "As seen in",
      logos: [],
    }),
  },

  // Blog
  {
    kind: "blog-list",
    label: "Blog list",
    description: "Featured blog posts.",
    category: "blog",
    scopes: ["home"],
    createDefaultProps: () => ({
      heading: "From the journal",
      limit: 3,
      columns: 3,
    }),
  },

  // PDP
  {
    kind: "pdp-gallery",
    label: "PDP gallery",
    description: "Product photo gallery with zoom.",
    category: "pdp",
    scopes: ["product-detail"],
    createDefaultProps: () => ({ layout: "thumbs-below", enableZoom: true }),
  },
  {
    kind: "pdp-buybox",
    label: "PDP buybox",
    description: "Name, price, Add to Cart.",
    category: "pdp",
    scopes: ["product-detail"],
    createDefaultProps: () => ({ showSku: true, showCategory: true }),
  },
  {
    kind: "pdp-details",
    label: "PDP details",
    description: "Product description block.",
    category: "pdp",
    scopes: ["product-detail"],
    createDefaultProps: () => ({ tabs: false }),
  },
  {
    kind: "pdp-related",
    label: "PDP related",
    description: "You may also like.",
    category: "pdp",
    scopes: ["product-detail"],
    createDefaultProps: () => ({
      heading: "You may also like",
      limit: 4,
      columns: 4,
    }),
  },
  {
    kind: "breadcrumbs",
    label: "Breadcrumbs",
    description: "Navigation trail.",
    category: "pdp",
    scopes: ["product-detail"],
    createDefaultProps: () => ({ scope: "product" }),
  },
];

const CATALOG_BY_KIND: Partial<Record<BlockKind, CatalogEntry>> =
  Object.fromEntries(
    BLOCK_CATALOG.map((entry) => [entry.kind, entry]),
  ) as Partial<Record<BlockKind, CatalogEntry>>;

export function getCatalogEntry(kind: string): CatalogEntry | undefined {
  return CATALOG_BY_KIND[kind as BlockKind];
}

export function listForScope(
  scope:
    | "home"
    | "products-index"
    | "product-detail"
    | "page"
    | "header"
    | "footer"
    | string,
): CatalogEntry[] {
  const s = scope as CatalogEntry["scopes"] extends (infer U)[] | undefined
    ? U
    : never;
  return BLOCK_CATALOG.filter(
    (entry) =>
      !entry.scopes || (entry.scopes as string[]).includes(s as string),
  );
}

// ---------------------------------------------------------------------------
// Factory — produce a fresh BlockNode with a stable uuid-ish id.
// ---------------------------------------------------------------------------

function randomId(): string {
  // Keep it short + stable for React keys. Crypto is available in the
  // browser; fall back to a timestamp for SSR safety.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `b_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function createBlockFromCatalog(entry: CatalogEntry): BlockNode {
  return {
    id: randomId(),
    kind: entry.kind,
    props: entry.createDefaultProps() as BlockNode["props"],
  };
}
