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
  | "pdp"
  | "form";

export interface CatalogEntry<K extends BlockKind = BlockKind> {
  /** Unique palette id — defaults to `kind` but must differ when multiple entries share a kind. */
  id?: string;
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
    id: "product-grid-new-arrivals",
    kind: "product-grid",
    label: "New Arrivals",
    description: "Latest products, sorted by date added.",
    category: "commerce",
    scopes: ["home"],
    createDefaultProps: () => ({
      source: "newest",
      limit: 8,
      columns: 4,
      cardVariant: "bordered",
      heading: "New Arrivals",
      eyebrow: "Just in",
    }),
  },
  {
    id: "product-grid-hot-deals",
    kind: "product-grid",
    label: "Hot Deals",
    description: "Products currently on sale (discounted).",
    category: "commerce",
    scopes: ["home"],
    createDefaultProps: () => ({
      source: "on-sale",
      limit: 8,
      columns: 4,
      cardVariant: "bordered",
      heading: "Hot Deals",
      eyebrow: "Limited time offers",
    }),
  },
  {
    id: "product-grid-staff-picks",
    kind: "product-grid",
    label: "Staff Picks",
    description: "Hand-picked products — select from your catalog.",
    category: "commerce",
    scopes: ["home"],
    createDefaultProps: () => ({
      source: "manual",
      limit: 8,
      columns: 4,
      cardVariant: "card",
      heading: "Staff Picks",
      eyebrow: "Curated for you",
      productIds: [],
    }),
  },
  {
    id: "product-grid-trending",
    kind: "product-grid",
    label: "Trending Products",
    description: "Hand-picked trending products for the homepage.",
    category: "commerce",
    scopes: ["home"],
    createDefaultProps: () => ({
      source: "manual",
      limit: 6,
      columns: 3,
      cardVariant: "bordered",
      heading: "Trending Now",
      eyebrow: "Popular picks",
      productIds: [],
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
    kind: "product-filters",
    label: "Product filters",
    description:
      "Sidebar with category / price / brand / attribute facets. Pair with a product-listing block inside a columns container on the products page.",
    category: "commerce",
    scopes: ["products-index"],
    createDefaultProps: () => ({
      heading: "Filters",
      show: {
        category: true,
        priceRange: true,
        brand: true,
      },
      stickyOffset: 96,
    }),
  },
  {
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
  },
  {
    kind: "announcement-bar",
    label: "Announcement bar",
    description:
      "Top-of-page strip (shipping, launch, promo) — static or scrolling marquee.",
    category: "marketing",
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
  },
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
    description: "Name, price, variant picker (chips), quantity, Add to Cart.",
    category: "pdp",
    scopes: ["product-detail"],
    createDefaultProps: () => ({
      showSku: true,
      showCategory: true,
      showVariantPicker: true,
      variantDisplay: "chips",
    }),
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

  // Layer 2
  {
    kind: "embed",
    label: "Embed / iframe",
    description: "Calendly, Google Forms, or any URL.",
    category: "content",
    createDefaultProps: () => ({
      src: "https://example.com",
      aspectRatio: "16/9",
      allowFullscreen: true,
    }),
  },
  {
    kind: "video",
    label: "Video",
    description: "YouTube, Vimeo, or direct MP4.",
    category: "content",
    createDefaultProps: () => ({
      source: "youtube",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      aspectRatio: "16/9",
    }),
  },
  {
    kind: "accordion",
    label: "Accordion",
    description: "Collapsible content sections.",
    category: "content",
    createDefaultProps: () => ({
      items: [
        { title: "Section 1", body: "Content for section 1." },
        { title: "Section 2", body: "Content for section 2." },
      ],
      allowMultiple: true,
    }),
  },
  {
    kind: "columns",
    label: "Columns",
    description: "2, 3, or 4-column layout for side-by-side content.",
    category: "layout",
    createDefaultProps: () => ({
      count: 2,
      gap: "md",
      verticalAlign: "start",
    }),
  },
  {
    kind: "gallery",
    label: "Image gallery",
    description: "Grid, masonry, or slideshow with optional lightbox.",
    category: "content",
    createDefaultProps: () => ({
      images: [],
      layout: "grid",
      columns: 3,
      lightbox: true,
    }),
  },
  {
    kind: "tabs",
    label: "Tabs",
    description: "Tabbed content panels.",
    category: "content",
    createDefaultProps: () => ({
      tabs: [
        { label: "Tab 1", content: "Content for tab 1." },
        { label: "Tab 2", content: "Content for tab 2." },
      ],
    }),
  },
  {
    kind: "form",
    label: "Form",
    description: "Contact or lead-capture form.",
    category: "marketing",
    createDefaultProps: () => ({
      heading: "Get in touch",
      fields: [
        { kind: "text", label: "Name", required: true },
        { kind: "email", label: "Email", required: true },
        { kind: "textarea", label: "Message", placeholder: "How can we help?" },
      ],
      submitLabel: "Send message",
      successMessage: "Thanks! We'll be in touch.",
      submitTo: "email",
    }),
  },

  // Layer 3
  {
    kind: "css-grid",
    label: "CSS Grid",
    description: "Advanced N-column grid layout (1–12 cols). Container block.",
    category: "layout",
    createDefaultProps: () => ({
      columns: 3,
      gap: "md",
    }),
  },

  // Custom / advanced
  {
    kind: "row",
    label: "Row",
    description:
      "Flexible horizontal row — place any blocks side by side. Wrapping, gap, and alignment fully configurable.",
    category: "layout",
    createDefaultProps: () => ({
      gap: "md",
      wrap: true,
      align: "start",
    }),
  },
  {
    kind: "custom-html",
    label: "Custom HTML",
    description:
      "Write raw HTML and optional CSS. Full control — use for embeds, custom widgets, or anything the preset blocks don't cover.",
    category: "content",
    createDefaultProps: () => ({
      html: "<p>Your custom HTML here</p>",
      css: "",
    }),
  },

  // Additional commerce blocks (not yet mapped to TypeScript types)
  {
    kind: "bundle-spotlight",
    label: "Bundle spotlight",
    description: "Featured product bundle with discount highlight.",
    category: "commerce",
    createDefaultProps: () => ({
      heading: "Special bundle",
      layout: "split",
    }),
  },
  {
    kind: "gift-card-redeem",
    label: "Gift card redeem",
    description: "Code input and balance checker.",
    category: "commerce",
    createDefaultProps: () => ({
      heading: "Redeem a gift card",
      subtitle: "Enter your code to apply.",
    }),
  },
  {
    kind: "recently-viewed",
    label: "Recently viewed",
    description: "Browsing history carousel.",
    category: "pdp",
    scopes: ["product-detail"],
    createDefaultProps: () => ({
      heading: "Recently viewed",
      maxItems: 6,
    }),
  },
  {
    kind: "reviews-list",
    label: "Reviews list",
    description: "Customer reviews with ratings.",
    category: "pdp",
    scopes: ["product-detail"],
    createDefaultProps: () => ({
      showSummary: true,
      reviewable: true,
      limit: 10,
      sortBy: "newest",
    }),
  },
  {
    kind: "fbt",
    label: "Frequently Bought Together",
    description: "Bundle of related products.",
    category: "pdp",
    scopes: ["product-detail"],
    createDefaultProps: () => ({
      source: "auto",
      maxItems: 3,
      showImages: true,
      ctaLabel: "Add all to cart",
    }),
  },
  {
    kind: "size-guide",
    label: "Size guide",
    description: "Sizing info table.",
    category: "pdp",
    scopes: ["product-detail"],
    createDefaultProps: () => ({
      variant: "modal",
      triggerLabel: "Size guide",
      note: "All measurements in cm.",
    }),
  },
  {
    kind: "product-comparison",
    label: "Product comparison",
    description: "Compare 2–4 products side-by-side.",
    category: "pdp",
    createDefaultProps: () => ({
      heading: "Compare",
      description: "",
      productIds: [],
      attributes: ["price", "category"],
    }),
  },
  {
    kind: "lookbook",
    label: "Lookbook",
    description: "Shoppable pinned image.",
    category: "pdp",
    createDefaultProps: () => ({
      aspect: "4/5",
      scenes: [],
    }),
  },

  // Additional marketing blocks
  {
    kind: "policy-strip",
    label: "Policy strip",
    description: "Shipping / returns / trust icons.",
    category: "marketing",
    createDefaultProps: () => ({
      items: [
        { label: "Free shipping" },
        { label: "30-day returns" },
        { label: "Secure checkout" },
      ],
    }),
  },

  // Header / Footer blocks
  {
    kind: "nav-bar",
    label: "Nav bar",
    description: "Logo · menu · search · cart (header global).",
    category: "marketing",
    createDefaultProps: () => ({
      brand: "Brand",
      brandHref: "/",
      showSearch: true,
      showCart: true,
      showAccount: false,
      sticky: true,
      variant: "standard",
      align: "between",
      items: [
        { label: "Shop", href: "/products" },
        { label: "About", href: "/about" },
      ],
    }),
  },
  {
    kind: "logo-mark",
    label: "Logo mark",
    description: "Standalone brand mark.",
    category: "marketing",
    createDefaultProps: () => ({
      brand: "Brand",
      subtitle: "Tagline",
      href: "/",
      align: "center",
      variant: "text-only",
    }),
  },
  {
    kind: "utility-bar",
    label: "Utility bar",
    description: "Top strip with small links.",
    category: "marketing",
    createDefaultProps: () => ({
      align: "between",
      items: [
        { label: "Free shipping", href: "" },
        { label: "Contact", href: "/contact" },
      ],
    }),
  },
  {
    kind: "footer-columns",
    label: "Footer columns",
    description: "2–6 link columns + brand.",
    category: "marketing",
    createDefaultProps: () => ({
      showBrand: true,
      brand: "Brand",
      tagline: "Company tagline.",
      columns: [
        {
          title: "Shop",
          links: [
            { label: "All", href: "/products" },
            { label: "New", href: "/products?sort=new" },
          ],
        },
        {
          title: "Help",
          links: [
            { label: "Contact", href: "/contact" },
            { label: "FAQ", href: "/faq" },
          ],
        },
      ],
    }),
  },
  {
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
  },
  {
    kind: "payment-icons",
    label: "Payment icons",
    description: "Visa, MC, PayPal, Apple Pay, etc.",
    category: "marketing",
    createDefaultProps: () => ({
      align: "end",
      variant: "flat",
      items: [
        { name: "Visa" },
        { name: "Mastercard" },
        { name: "Amex" },
        { name: "PayPal" },
      ],
    }),
  },
  {
    kind: "copyright-bar",
    label: "Copyright bar",
    description: "Bottom © line + links.",
    category: "marketing",
    createDefaultProps: () => ({
      copy: "© 2026. All rights reserved.",
      showLinks: true,
      items: [
        { label: "Privacy", href: "/privacy" },
        { label: "Terms", href: "/terms" },
      ],
    }),
  },

  // Utility
  {
    kind: "empty-state",
    label: "Empty state",
    description: "Placeholder for not-found / no-results.",
    category: "content",
    createDefaultProps: () => ({
      preset: "generic",
      heading: "Nothing here yet",
      subtitle: "Add content to bring this page to life.",
      illustration: "package",
      primaryCtaLabel: "Go home",
      primaryCtaHref: "/",
    }),
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
