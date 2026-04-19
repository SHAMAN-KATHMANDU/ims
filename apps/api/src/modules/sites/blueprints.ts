/**
 * Template blueprints — one canonical block tree per template slug.
 *
 * When a platform admin picks a template for a tenant (`POST /sites/template`
 * or the tenant-facing equivalent), the sites service seeds a SiteLayout
 * row for each scope from the matching blueprint. The tenant can then open
 * the design editor and start from a real layout instead of an empty page.
 *
 * Each blueprint's home tree is intentionally distinct — different hero
 * variants, different section orderings, different commerce block sources
 * — so picking Editorial vs. Dark vs. Gallery produces visually different
 * output even before the tenant edits a single block. Shared design
 * tokens still come from `SiteTemplate.defaultBranding`, so typography
 * and color palette already match the template's visual identity.
 *
 * Scopes populated per blueprint:
 *   - home              — the composed landing page
 *   - products-index    — product listing with filters + pagination
 *   - product-detail    — PDP gallery + buybox + details + related
 *
 * Each block kind + prop shape is validated by @repo/shared/BlockTreeSchema
 * at the service boundary, so a typo in a blueprint fails loudly at seed
 * time rather than silently producing broken pages.
 */

import type { BlockNode, BlockPropsMap } from "@repo/shared";

type BlueprintScope = "home" | "products-index" | "product-detail";

export interface TemplateBlueprint {
  slug: string;
  layouts: Partial<Record<BlueprintScope, BlockNode[]>>;
  defaultThemeTokens?: {
    mode?: "light" | "dark";
    colors?: Record<string, string>;
    typography?: {
      heading?: { family: string };
      body?: { family: string };
      scaleRatio?: number;
      baseSize?: number;
    };
    spacing?: {
      unit?: number;
      section?: "compact" | "balanced" | "spacious";
      container?: number;
    };
    shape?: {
      radius?: "sharp" | "soft" | "rounded";
      buttonStyle?: "solid" | "outline" | "pill";
    };
  };
}

// ---------------------------------------------------------------------------
// Block factory helpers
// ---------------------------------------------------------------------------

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

function block<K extends keyof BlockPropsMap>(
  kind: K,
  props: BlockPropsMap[K],
  idHint?: string,
): BlockNode<K> {
  return {
    id: nextId(idHint ?? kind),
    kind,
    props,
  };
}

// ---------------------------------------------------------------------------
// Shared scope layouts (products-index / product-detail)
// ---------------------------------------------------------------------------
//
// The index + PDP compositions are close to identical across templates
// (variation comes from theme tokens, not block order), so we share one
// factory each rather than duplicating 10 copies.

function productsIndexLayout(): BlockNode[] {
  return [
    block("heading", {
      text: "Shop",
      level: 1,
      alignment: "center",
      eyebrow: "All products",
    }),
    block("product-listing", {
      pageSize: 24,
      defaultSort: "newest",
      showSort: true,
      columns: 4,
      categoryFilter: true,
    }),
  ];
}

// Shared gallery+buybox row builder. Each template's PDP factory picks
// its own gallery layout / buybox options but the two-column scaffold
// stays consistent (sticky gallery on the left, buybox stacks under on
// mobile).
function pdpColumns(
  galleryLayout: BlockPropsMap["pdp-gallery"]["layout"] = "thumbs-below",
  opts: {
    enableZoom?: boolean;
    galleryAspect?: BlockPropsMap["pdp-gallery"]["aspectRatio"];
    buybox?: BlockPropsMap["pdp-buybox"];
    stickyFirst?: boolean;
  } = {},
): BlockNode {
  const galleryProps: BlockPropsMap["pdp-gallery"] = {
    layout: galleryLayout,
    enableZoom: opts.enableZoom ?? true,
    ...(opts.galleryAspect ? { aspectRatio: opts.galleryAspect } : {}),
  };
  const buyboxProps: BlockPropsMap["pdp-buybox"] = {
    showSku: true,
    showCategory: true,
    ...opts.buybox,
  };
  return {
    ...block("columns", {
      count: 2,
      gap: "lg",
      verticalAlign: "start",
      stackBelow: "lg",
      stickyFirst: opts.stickyFirst ?? true,
    }),
    children: [
      block("pdp-gallery", galleryProps),
      block("pdp-buybox", buyboxProps),
    ],
  };
}

// Per-template PDP layouts. Each composition is tuned to the template's
// voice — apothecary leans on trust + FAQ, dark leans on drop urgency,
// zen stays bare, gallery makes the image dominate, etc. All share the
// breadcrumbs + gallery/buybox + pdp-details backbone so the tenant can
// delete a section without breaking the rest of the page.

function editorialPdp(): BlockNode[] {
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("thumbs-left", {
      buybox: {
        showSku: true,
        showCategory: true,
        priceSize: "lg",
        showDescription: true,
        variantDisplay: "chips",
      },
    }),
    block("pdp-details", { tabs: true }),
    block("story-split", {
      eyebrow: "On this piece",
      title: "Chosen for a reason",
      body: "Every object we carry has been handled, assessed, and selected. Read the note behind why this one made it in.",
      imageSide: "right",
    }),
    block("reviews-list", {
      heading: "From the readers",
      productIdSource: "current-pdp",
      pageSize: 6,
      showRatingSummary: true,
      emptyMessage: "No reviews yet — be the first to weigh in.",
    }),
    block("pdp-related", {
      heading: "More from the collection",
      limit: 4,
      columns: 4,
    }),
  ];
}

function organicPdp(): BlockNode[] {
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("stacked", {
      buybox: { showSku: true, showCategory: true, showDescription: true },
    }),
    block("trust-strip", {
      items: [
        { label: "Naturally sourced", value: "100%" },
        { label: "Small batch", value: "Always" },
        { label: "Ethical", value: "Supply chain" },
      ],
    }),
    block("pdp-details", { tabs: false }),
    block("story-split", {
      eyebrow: "How it's made",
      title: "Made the slow way",
      body: "Each piece takes the time it takes — hours of hand-finishing, weeks of resting, months from source to shelf.",
      imageSide: "left",
    }),
    block("reviews-list", {
      heading: "Customer reviews",
      productIdSource: "current-pdp",
      pageSize: 5,
      showRatingSummary: true,
    }),
    block("fbt", {
      heading: "Pairs well with",
      productIdSource: "current-pdp",
      limit: 4,
      columns: 4,
      cardVariant: "bare",
    }),
    block("recently-viewed", {
      heading: "Recently viewed",
      limit: 4,
      columns: 4,
      cardVariant: "bare",
      hideWhenEmpty: true,
      excludeCurrent: true,
    }),
  ];
}

function darkPdp(): BlockNode[] {
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("thumbs-below", {
      buybox: {
        showSku: true,
        showCategory: true,
        priceSize: "lg",
        variantDisplay: "chips",
      },
      stickyFirst: true,
    }),
    block("stats-band", {
      dark: true,
      alignment: "center",
      valueSize: "lg",
      items: [
        { value: "24h", label: "Dispatch" },
        { value: "Limited", label: "Run" },
        { value: "∞", label: "Replays" },
      ],
    }),
    block("pdp-details", { tabs: true }),
    block("fbt", {
      heading: "Completes the fit",
      productIdSource: "current-pdp",
      limit: 4,
      columns: 4,
      cardVariant: "card",
    }),
    block("bento-showcase", {
      eyebrow: "This month",
      heading: "Other drops",
      source: "featured",
      limit: 5,
    }),
    block("reviews-list", {
      heading: "Reviews",
      productIdSource: "current-pdp",
      pageSize: 5,
      showRatingSummary: true,
    }),
  ];
}

function brutalistPdp(): BlockNode[] {
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("thumbs-below", {
      buybox: {
        showSku: true,
        showCategory: false,
        variantDisplay: "dropdown",
      },
    }),
    block("pdp-details", { tabs: false }),
    block("pdp-related", { heading: "More", limit: 4, columns: 4 }),
  ];
}

function zenPdp(): BlockNode[] {
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("thumbs-below", {
      buybox: {
        showSku: false,
        showCategory: true,
        priceSize: "md",
        showDescription: true,
      },
    }),
    block("pdp-details", { tabs: false }),
    block("reviews-list", {
      heading: "Notes from others",
      productIdSource: "current-pdp",
      pageSize: 4,
      showRatingSummary: true,
    }),
    block("recently-viewed", {
      heading: "Recently considered",
      limit: 3,
      columns: 3,
      cardVariant: "bare",
      hideWhenEmpty: true,
      excludeCurrent: true,
    }),
  ];
}

function coastalPdp(): BlockNode[] {
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("thumbs-below", { galleryAspect: "4/5" }),
    block("pdp-details", { tabs: false }),
    block("policy-strip", {
      layout: "grid",
      columns: 4,
      items: [
        {
          label: "Free shipping",
          detail: "Orders over ₹3,000",
          icon: "shipping",
        },
        { label: "Easy returns", detail: "30-day window", icon: "returns" },
        {
          label: "Secure payment",
          detail: "Encrypted checkout",
          icon: "secure",
        },
        { label: "We're here", detail: "Mon–Sat support", icon: "support" },
      ],
    }),
    block("reviews-list", {
      heading: "What buyers say",
      productIdSource: "current-pdp",
      pageSize: 5,
      showRatingSummary: true,
    }),
    block("fbt", {
      heading: "Style it with",
      productIdSource: "current-pdp",
      limit: 4,
      columns: 4,
      cardVariant: "bordered",
    }),
    block("recently-viewed", {
      heading: "Recently viewed",
      limit: 4,
      columns: 4,
      cardVariant: "bordered",
      hideWhenEmpty: true,
      excludeCurrent: true,
    }),
  ];
}

function apothecaryPdp(): BlockNode[] {
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("thumbs-left", {
      buybox: {
        showSku: true,
        showCategory: true,
        showDescription: true,
      },
    }),
    block("trust-strip", {
      columns: 4,
      items: [
        { label: "Botanical", value: "Sourced" },
        { label: "Small batch", value: "Handmade" },
        { label: "Third-party", value: "Tested" },
        { label: "Cruelty", value: "Free" },
      ],
    }),
    block("pdp-details", { tabs: true }),
    block("faq", {
      heading: "Questions about this formula",
      variant: "bordered",
      items: [
        {
          question: "How should I store it?",
          answer:
            "Cool, dry, away from direct sun. Most products keep 12 months after opening.",
        },
        {
          question: "Is it tested on animals?",
          answer:
            "Never. Every formula is cruelty-free and third-party verified.",
        },
        {
          question: "Suitable for sensitive skin?",
          answer:
            "Most formulas are — the label calls out common allergens when they're present.",
        },
      ],
    }),
    block("reviews-list", {
      heading: "Reviews",
      productIdSource: "current-pdp",
      pageSize: 5,
      showRatingSummary: true,
    }),
    block("fbt", {
      heading: "Often paired with",
      productIdSource: "current-pdp",
      limit: 4,
      columns: 4,
      cardVariant: "card",
    }),
    block("policy-strip", {
      layout: "inline",
      items: [
        { label: "Free shipping", detail: "Over ₹2,000", icon: "shipping" },
        { label: "30-day returns", detail: "Unopened", icon: "returns" },
        { label: "Secure payment", detail: "SSL", icon: "secure" },
      ],
    }),
  ];
}

function retroPdp(): BlockNode[] {
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("thumbs-below", {
      buybox: { showSku: true, showCategory: true, priceSize: "lg" },
    }),
    block("stats-band", {
      items: [
        { value: "40 yrs", label: "Running" },
        { value: "1k+", label: "Products" },
        { value: "100%", label: "Ours" },
      ],
    }),
    block("pdp-details", { tabs: true }),
    block("reviews-list", {
      heading: "What the regulars say",
      productIdSource: "current-pdp",
      pageSize: 5,
      showRatingSummary: true,
    }),
    block("fbt", {
      heading: "Grab these too",
      productIdSource: "current-pdp",
      limit: 4,
      columns: 4,
      cardVariant: "card",
    }),
    block("pdp-related", {
      heading: "More classics",
      limit: 4,
      columns: 4,
    }),
    block("bento-showcase", {
      heading: "This month's picks",
      source: "featured",
      limit: 5,
    }),
  ];
}

function artisanPdp(): BlockNode[] {
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("thumbs-left", {
      buybox: {
        showSku: true,
        showCategory: true,
        showDescription: true,
        priceSize: "lg",
      },
    }),
    block("story-split", {
      eyebrow: "The maker",
      title: "Every piece is signed",
      body: "This was made by one of the artisans we've worked with for years. It carries their mark on the base — a small assurance that a real pair of hands finished it.",
      imageSide: "right",
    }),
    block("pdp-details", { tabs: true }),
    block("testimonials", {
      heading: "From our collectors",
      layout: "stacked",
      items: [
        {
          quote: "Four pieces over five years, each still in rotation.",
          author: "Priya S.",
          role: "Bangalore",
        },
        {
          quote: "The detail is extraordinary — photos don't do it justice.",
          author: "James W.",
          role: "Brooklyn",
        },
      ],
    }),
    block("reviews-list", {
      heading: "Customer reviews",
      productIdSource: "current-pdp",
      pageSize: 5,
      showRatingSummary: true,
    }),
    block("policy-strip", {
      layout: "inline",
      items: [
        {
          label: "Handmade",
          detail: "Signed by the maker",
          icon: "warranty",
        },
        { label: "Gift-ready", detail: "Complimentary wrap", icon: "gift" },
        {
          label: "Lifetime care",
          detail: "Repairs at cost",
          icon: "support",
        },
      ],
    }),
    block("pdp-related", {
      heading: "From the same maker",
      limit: 4,
      columns: 4,
    }),
  ];
}

function galleryPdp(): BlockNode[] {
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("stacked", {
      galleryAspect: "4/5",
      buybox: {
        showSku: true,
        showCategory: true,
        priceSize: "md",
        showDescription: true,
      },
    }),
    block("pdp-details", { tabs: false }),
    block("bento-showcase", {
      eyebrow: "From the same artist",
      heading: "Related works",
      source: "featured",
      limit: 5,
    }),
    block("reviews-list", {
      heading: "Notes",
      productIdSource: "current-pdp",
      pageSize: 4,
      showRatingSummary: true,
      emptyMessage: "No public notes yet.",
    }),
    block("pdp-related", {
      heading: "Rest of the catalog",
      limit: 6,
      columns: 3,
    }),
  ];
}

function blankPdp(): BlockNode[] {
  // New-tenant default PDP. Matches the home blueprint's "showcase every
  // strong block" philosophy — tenants can delete reviews/fbt/recently
  // if not relevant, but they see the full toolkit out of the box.
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("thumbs-below", {
      buybox: {
        showSku: true,
        showCategory: true,
        showDescription: true,
        priceSize: "lg",
      },
    }),
    block("pdp-details", { tabs: true }),
    block("trust-strip", {
      items: [
        { label: "Free shipping", value: "Over ₹2,000" },
        { label: "30-day returns", value: "No questions" },
        { label: "Secure payment", value: "SSL" },
      ],
    }),
    block("reviews-list", {
      heading: "Customer reviews",
      productIdSource: "current-pdp",
      pageSize: 5,
      showRatingSummary: true,
      emptyMessage: "Be the first to review this product.",
    }),
    block("fbt", {
      heading: "Frequently bought together",
      productIdSource: "current-pdp",
      limit: 4,
      columns: 4,
      cardVariant: "bordered",
    }),
    block("pdp-related", {
      heading: "You may also like",
      limit: 4,
      columns: 4,
    }),
    block("recently-viewed", {
      heading: "Recently viewed",
      limit: 4,
      columns: 4,
      cardVariant: "bare",
      hideWhenEmpty: true,
      excludeCurrent: true,
    }),
  ];
}

// ---------------------------------------------------------------------------
// Per-template home layouts
// ---------------------------------------------------------------------------

function editorialHome(): BlockNode[] {
  // Tall editorial hero → trust → category tiles → big product grid →
  // story split → bento → stats → testimonials → FAQ → newsletter.
  return [
    block("hero", {
      variant: "editorial",
      title: "Curated for the discerning eye",
      ctaLabel: "Shop the collection",
      ctaHref: "/products",
    }),
    block("trust-strip", {
      items: [
        { label: "Handcrafted", value: "By artisans" },
        { label: "Shipping", value: "Free over ₹5,000" },
        { label: "Returns", value: "30 days" },
        { label: "Support", value: "Mon–Sat" },
      ],
    }),
    block("category-tiles", {
      heading: "Shop by category",
      columns: 3,
      aspectRatio: "4/5",
    }),
    block("product-grid", {
      eyebrow: "New arrivals",
      heading: "Just in",
      source: "featured",
      limit: 8,
      columns: 4,
      cardVariant: "bordered",
    }),
    block("story-split", {
      eyebrow: "Our story",
      title: "Crafted with intention",
      body: "Every piece in our collection is the result of countless hours of careful work by artisans we've known for years. No two are quite alike, and that's the point.",
      imageSide: "left",
      ctaHref: "/about",
      ctaLabel: "Read more",
    }),
    block("bento-showcase", {
      eyebrow: "Featured",
      heading: "Worth a closer look",
      source: "featured",
      limit: 5,
    }),
    block("stats-band", {
      items: [
        { value: "12 yrs", label: "Crafting" },
        { value: "42", label: "Artisans" },
        { value: "6k+", label: "Happy customers" },
      ],
    }),
    block("testimonials", {
      heading: "What people say",
      items: [
        {
          quote:
            "The quality is unreal. Everything arrives packed like it matters — because it does.",
          author: "Aditi R.",
          role: "Mumbai",
        },
        {
          quote:
            "I've bought three pieces and each one is better than the last.",
          author: "Marcus T.",
          role: "London",
        },
      ],
    }),
    block("faq", {
      heading: "Frequently asked",
      items: [
        {
          question: "Do you ship internationally?",
          answer:
            "Yes, to 60+ countries. Standard delivery runs 7–12 business days.",
        },
        {
          question: "What is your return policy?",
          answer:
            "30-day returns on everything except final-sale items. We cover the return label for domestic orders.",
        },
        {
          question: "Are the pieces really handcrafted?",
          answer:
            "Every single one. We work directly with a small roster of artisans — no factories, no contractors.",
        },
        {
          question: "Do you offer gift wrapping?",
          answer:
            "Yes — optional at checkout. Each gift box comes with a hand-written card if you include a message.",
        },
      ],
    }),
    block("newsletter", {
      title: "Stay in the loop",
      subtitle: "Occasional updates from the workshop.",
      cta: "Subscribe",
    }),
  ];
}

function organicHome(): BlockNode[] {
  // Warm, earthy. Hero → story first (before commerce) → products →
  // category tiles → newsletter.
  return [
    block("hero", {
      variant: "standard",
      title: "Rooted in nature, crafted by hand",
      subtitle: "Ethically sourced, thoughtfully made",
      ctaLabel: "Explore the collection",
      ctaHref: "/products",
    }),
    block("story-split", {
      eyebrow: "Rooted in craft",
      title: "Grown slowly, made carefully",
      body: "We work with a small circle of makers across the region. Each piece takes the time it takes.",
      imageSide: "right",
      ctaHref: "/about",
      ctaLabel: "Our process",
    }),
    block("product-grid", {
      eyebrow: "This season",
      heading: "New for spring",
      source: "featured",
      limit: 6,
      columns: 3,
      cardVariant: "bare",
    }),
    block("category-tiles", {
      heading: "Browse by collection",
      columns: 3,
      aspectRatio: "4/5",
    }),
    block("trust-strip", {
      items: [
        { label: "Natural", value: "Materials" },
        { label: "Small batch", value: "Always" },
        { label: "Ethical", value: "Supply chain" },
      ],
    }),
    block("testimonials", {
      heading: "What makers are saying",
      layout: "grid",
      items: [
        {
          quote:
            "Every piece I send to their studio comes back with more soul than I gave it. A rare partnership.",
          author: "Aanya Raut",
          role: "Weaver, Kolhapur",
        },
        {
          quote:
            "They pay on time, order in small batches, and tell the story honestly. That is everything.",
          author: "Deepak Lal",
          role: "Potter, Pondicherry",
        },
      ],
    }),
    block("newsletter", {
      title: "Grow with us",
      subtitle: "Seasonal notes, nothing else.",
      cta: "Join",
    }),
  ];
}

function darkHome(): BlockNode[] {
  // Dark moodboard. Bento showcase is the headline, products second.
  return [
    block("hero", {
      variant: "editorial",
      title: "Design that takes a position",
      subtitle: "Bold choices, no compromise",
      ctaLabel: "Enter the collection",
      ctaHref: "/products",
    }),
    block("bento-showcase", {
      eyebrow: "Featured",
      heading: "This month's drop",
      source: "featured",
      limit: 5,
    }),
    block("product-grid", {
      heading: "Latest",
      source: "newest",
      limit: 8,
      columns: 4,
      cardVariant: "card",
    }),
    block("stats-band", {
      dark: true,
      items: [
        { value: "24hrs", label: "Dispatch" },
        { value: "∞", label: "Replays" },
        { value: "12", label: "Countries" },
      ],
    }),
    block("story-split", {
      eyebrow: "Manifesto",
      title: "Design is an argument",
      body: "Every piece takes a position. We're not interested in the middle.",
      imageSide: "left",
    }),
    block("testimonials", {
      heading: "Field notes",
      layout: "grid",
      items: [
        {
          quote:
            "Nothing apologetic about this work. You can tell someone made a decision and committed.",
          author: "Tomás R.",
          role: "Barcelona",
        },
        {
          quote:
            "Bought the chair eighteen months ago. Still the best object in the house.",
          author: "Nina K.",
          role: "Berlin",
        },
      ],
    }),
    block("policy-strip", {
      layout: "inline",
      dark: true,
      items: [
        { label: "Free shipping", detail: "Over ₹5,000", icon: "shipping" },
        { label: "Secure checkout", detail: "256-bit SSL", icon: "secure" },
        { label: "30-day returns", detail: "No questions", icon: "returns" },
      ],
    }),
    block("blog-list", { heading: "From the journal", limit: 3, columns: 3 }),
    block("newsletter", {
      title: "Get notified",
      subtitle: "First access to every drop.",
      cta: "Notify me",
    }),
  ];
}

function brutalistHome(): BlockNode[] {
  // Minimal type-driven — big headline, product grid, that's it.
  return [
    block("hero", {
      variant: "minimal",
      title: "No frills. Just product.",
      ctaLabel: "Browse",
      ctaHref: "/products",
    }),
    block("product-grid", {
      heading: "Products",
      source: "featured",
      limit: 12,
      columns: 4,
      cardVariant: "bare",
    }),
    block("story-split", {
      title: "No frills",
      body: "We make things. You buy them. That's the arrangement.",
      imageSide: "right",
    }),
    block("blog-list", { heading: "From the journal", limit: 3, columns: 3 }),
    block("newsletter", {
      title: "Updates",
      subtitle: "Infrequent, relevant.",
      cta: "OK",
    }),
  ];
}

function zenHome(): BlockNode[] {
  // Whitespace-heavy, slow pacing.
  return [
    block("hero", {
      variant: "minimal",
      title: "Less, but better",
      subtitle: "Carefully chosen objects for a considered life",
      ctaLabel: "Begin",
      ctaHref: "/products",
    }),
    block("story-split", {
      eyebrow: "Philosophy",
      title: "Less, but better",
      body: "The objects around you shape the way you move through a day. We choose ours carefully.",
      imageSide: "left",
    }),
    block("product-grid", {
      eyebrow: "Selection",
      heading: "A few things",
      source: "featured",
      limit: 6,
      columns: 3,
      cardVariant: "bare",
    }),
    block("stats-band", {
      items: [
        { value: "7", label: "Categories" },
        { value: "48", label: "Items" },
        { value: "1", label: "Focus" },
      ],
    }),
    block("blog-list", { heading: "From the journal", limit: 3, columns: 3 }),
    block("newsletter", {
      title: "Occasional notes",
      subtitle: "Once a season.",
      cta: "Subscribe",
    }),
  ];
}

function coastalHome(): BlockNode[] {
  // Airy, sunlit, California-inspired.
  return [
    block("hero", {
      variant: "boutique",
      title: "Made near the sea",
      subtitle: "Light, easy, California-inspired",
      ctaLabel: "Shop the lookbook",
      ctaHref: "/products",
    }),
    block("category-tiles", {
      heading: "By the water",
      columns: 3,
      aspectRatio: "16/9",
    }),
    block("product-grid", {
      eyebrow: "Summer",
      heading: "Pieces for warmer days",
      source: "newest",
      limit: 8,
      columns: 4,
      cardVariant: "bordered",
    }),
    block("story-split", {
      eyebrow: "On the coast",
      title: "Made near the sea",
      body: "Our studio sits three blocks from the water. Everything we make carries a little of that air.",
      imageSide: "right",
    }),
    block("bento-showcase", {
      heading: "Favorites",
      source: "featured",
      limit: 5,
    }),
    block("testimonials", {
      heading: "Postcards from customers",
      layout: "carousel",
      items: [
        {
          quote:
            "Wore the linen shirt straight from the plane to the beach and it looked better by sunset. Feels like summer.",
          author: "Maya A.",
          role: "Santa Monica",
        },
        {
          quote:
            "The towel set is now in every beach bag in our family. Good weight, dries fast, ages beautifully.",
          author: "Ravi K.",
          role: "Kovalam",
        },
        {
          quote:
            "Packaging is plastic-free and actually pretty. Small touches matter.",
          author: "Jules P.",
          role: "Bondi",
        },
      ],
    }),
    block("policy-strip", {
      layout: "grid",
      columns: 4,
      items: [
        {
          label: "Free shipping",
          detail: "Orders over ₹3,000",
          icon: "shipping",
        },
        { label: "Easy returns", detail: "30-day window", icon: "returns" },
        {
          label: "Secure payment",
          detail: "Encrypted checkout",
          icon: "secure",
        },
        { label: "We're here", detail: "Mon–Sat support", icon: "support" },
      ],
    }),
    block("blog-list", { heading: "From the journal", limit: 3, columns: 3 }),
    block("newsletter", {
      title: "Summer notes",
      subtitle: "No more than one email a month.",
      cta: "Subscribe",
    }),
  ];
}

function apothecaryHome(): BlockNode[] {
  // Old-world, botanical, trust-forward.
  return [
    block("hero", {
      variant: "standard",
      title: "Nature's finest remedies",
      subtitle: "Botanical formulas, handcrafted with care",
      ctaLabel: "Shop remedies",
      ctaHref: "/products",
    }),
    block("trust-strip", {
      items: [
        { label: "Botanical", value: "Sourced" },
        { label: "Small batch", value: "Handmade" },
        { label: "Third-party", value: "Tested" },
        { label: "Cruelty", value: "Free" },
      ],
    }),
    block("category-tiles", {
      heading: "Browse the shelves",
      columns: 4,
      aspectRatio: "3/4",
    }),
    block("product-grid", {
      heading: "Best sellers",
      source: "featured",
      limit: 8,
      columns: 4,
      cardVariant: "card",
    }),
    block("story-split", {
      eyebrow: "Since 2012",
      title: "A small apothecary",
      body: "We founded the shop with one idea: make things that work, from ingredients you can pronounce.",
      imageSide: "left",
      ctaHref: "/about",
      ctaLabel: "Our story",
    }),
    block("testimonials", {
      heading: "Kind words from the shelves",
      layout: "stacked",
      items: [
        {
          quote:
            "The rosehip balm cleared up a dryness nothing else would touch. I buy it in threes now.",
          author: "Leela N.",
          role: "Goa",
        },
        {
          quote:
            "Everything smells like a garden, not a lab. My grandmother would approve.",
          author: "Helen B.",
          role: "Edinburgh",
        },
      ],
    }),
    block("faq", {
      heading: "Common questions",
      items: [
        {
          question: "Are the ingredients tested on animals?",
          answer: "Never.",
        },
        {
          question: "Do you ship internationally?",
          answer: "Yes, to 40+ countries.",
        },
        {
          question: "How long do the products last?",
          answer:
            "Most unopened products last 12–18 months; check the label after opening.",
        },
      ],
    }),
    block("newsletter", {
      title: "Join the list",
      subtitle: "New formulas, restocks, and seasonal picks.",
      cta: "Subscribe",
    }),
  ];
}

function retroHome(): BlockNode[] {
  // Bold colors, stats-heavy, product-grid driven.
  return [
    block("hero", {
      variant: "standard",
      title: "Classics never go out of style",
      subtitle: "Timeless design, modern quality",
      ctaLabel: "Shop now",
      ctaHref: "/products",
    }),
    block("stats-band", {
      items: [
        { value: "40 yrs", label: "Running" },
        { value: "1k+", label: "Products" },
        { value: "100%", label: "Ours" },
      ],
    }),
    block("product-grid", {
      eyebrow: "Classics",
      heading: "The collection",
      source: "newest",
      limit: 12,
      columns: 4,
      cardVariant: "card",
    }),
    block("bento-showcase", {
      heading: "Featured",
      source: "featured",
      limit: 5,
    }),
    block("trust-strip", {
      items: [
        { label: "Free", value: "Shipping" },
        { label: "30 day", value: "Returns" },
        { label: "Secure", value: "Checkout" },
      ],
    }),
    block("testimonials", {
      heading: "Since day one",
      layout: "carousel",
      items: [
        {
          quote:
            "Been buying here since the 80s. Same family, same quality, same welcome.",
          author: "Harold C.",
          role: "Hyderabad",
        },
        {
          quote:
            "You can't find this stuff anywhere else. Classic fit, built to outlast fashion.",
          author: "Ellen M.",
          role: "Dublin",
        },
        {
          quote: "Perfect gift shop for the hard-to-please uncle.",
          author: "Priyal S.",
          role: "Pune",
        },
      ],
    }),
    block("blog-list", { heading: "From the journal", limit: 3, columns: 3 }),
    block("newsletter", {
      title: "Don't miss a drop",
      subtitle: "Get new arrivals first.",
      cta: "Sign up",
    }),
  ];
}

function artisanHome(): BlockNode[] {
  // Story-first, crafted feeling, testimonials-heavy.
  return [
    block("hero", {
      variant: "luxury",
      title: "From our workshop to your home",
      ctaLabel: "See the work",
      ctaHref: "/products",
    }),
    block("story-split", {
      eyebrow: "Made by hand",
      title: "From our workshop to your home",
      body: "Every piece starts as a conversation with a maker. It ends, months later, as something we're proud to send.",
      imageSide: "left",
      ctaHref: "/about",
      ctaLabel: "Meet the makers",
    }),
    block("bento-showcase", {
      eyebrow: "Featured",
      heading: "Works in the collection",
      source: "featured",
      limit: 5,
    }),
    block("product-grid", {
      heading: "The full shop",
      source: "featured",
      limit: 8,
      columns: 4,
      cardVariant: "bordered",
    }),
    block("policy-strip", {
      layout: "inline",
      items: [
        { label: "Handmade", detail: "Signed by the maker", icon: "warranty" },
        {
          label: "Free shipping",
          detail: "Orders over ₹5,000",
          icon: "shipping",
        },
        { label: "Gift-ready", detail: "Complimentary wrap", icon: "gift" },
        { label: "Lifetime care", detail: "Repairs at cost", icon: "support" },
      ],
    }),
    block("testimonials", {
      heading: "From our collectors",
      items: [
        {
          quote:
            "I've bought four pieces over five years. Every one is still in rotation.",
          author: "Priya S.",
          role: "Bangalore",
        },
        {
          quote: "The detail is extraordinary. Photos don't do it justice.",
          author: "James W.",
          role: "Brooklyn",
        },
        {
          quote: "They remember me by name. Feels like a real shop.",
          author: "Amelia K.",
          role: "Paris",
        },
      ],
    }),
    block("newsletter", {
      title: "Join the circle",
      subtitle: "Occasional letters, never sales-y.",
      cta: "Subscribe",
    }),
  ];
}

function galleryHome(): BlockNode[] {
  // Image-first. Bento dominates; product grid is secondary.
  return [
    block("hero", {
      variant: "editorial",
      title: "Current collection",
      subtitle: "An independent gallery, by appointment",
      ctaLabel: "View the collection",
      ctaHref: "/products",
    }),
    block("bento-showcase", {
      eyebrow: "On view",
      heading: "Current exhibition",
      source: "featured",
      limit: 5,
    }),
    block("category-tiles", {
      heading: "Browse by medium",
      columns: 4,
      aspectRatio: "1/1",
    }),
    block("product-grid", {
      heading: "The permanent collection",
      source: "featured",
      limit: 12,
      columns: 4,
      cardVariant: "bare",
    }),
    block("story-split", {
      eyebrow: "About the gallery",
      title: "A small, independent space",
      body: "We show work by artists we know personally. The roster is small on purpose.",
      imageSide: "right",
    }),
    block("policy-strip", {
      layout: "inline",
      items: [
        { label: "Insured shipping", detail: "Worldwide", icon: "shipping" },
        {
          label: "Certificate",
          detail: "Provenance included",
          icon: "warranty",
        },
        { label: "Private viewing", detail: "By appointment", icon: "support" },
      ],
    }),
    block("testimonials", {
      heading: "From our collectors",
      layout: "stacked",
      items: [
        {
          quote:
            "The gallery pairs pieces with collectors carefully. What I left with felt chosen for me, not sold to me.",
          author: "Rohan V.",
          role: "Collector, Delhi",
        },
        {
          quote:
            "Every acquisition arrives with a letter from the artist. That kind of intimacy is rare now.",
          author: "Claire D.",
          role: "Collector, Montréal",
        },
      ],
    }),
    block("blog-list", { heading: "From the journal", limit: 3, columns: 3 }),
    block("newsletter", {
      title: "Exhibition openings",
      subtitle: "One email per show.",
      cta: "Subscribe",
    }),
  ];
}

function blankHome(): BlockNode[] {
  // New-tenant default blueprint. Showcases the strongest blocks so a
  // freshly-seeded store looks polished out of the box — tenants can
  // delete what they don't want rather than starting from an empty
  // canvas and wondering what's possible.
  return [
    block("hero", {
      variant: "standard",
      title: "Welcome to your store",
      subtitle: "Replace this headline with your brand's promise.",
      ctaLabel: "Shop the collection",
      ctaHref: "/products",
    }),
    block("trust-strip", {
      items: [
        { label: "Free shipping", value: "Over ₹2,000" },
        { label: "Easy returns", value: "30 days" },
        { label: "Secure checkout", value: "SSL" },
        { label: "Real support", value: "Mon–Sat" },
      ],
    }),
    block("product-grid", {
      eyebrow: "Featured",
      heading: "Shop our picks",
      source: "featured",
      limit: 8,
      columns: 4,
      cardVariant: "card",
    }),
    block("story-split", {
      eyebrow: "Our story",
      title: "A short line about who you are",
      body: "Use this space to tell visitors why your store exists — what you care about, who you make for, and what makes your picks different. Two or three sentences is plenty.",
      imageSide: "right",
      ctaHref: "/about",
      ctaLabel: "Learn more",
    }),
    block("testimonials", {
      heading: "What customers say",
      layout: "grid",
      columns: 3,
      items: [
        {
          quote:
            "Replace with a real customer quote once you have one — short, specific, and under 25 words works best.",
          author: "A. Shopper",
          role: "Verified buyer",
        },
        {
          quote:
            "A second quote helps buyers see themselves here. Two or three testimonials is the sweet spot.",
          author: "B. Reviewer",
          role: "Loyal customer",
        },
        {
          quote: "Swap these placeholders for real reviews before you launch.",
          author: "C. Fan",
          role: "Repeat buyer",
        },
      ],
    }),
    block("policy-strip", {
      layout: "grid",
      columns: 4,
      items: [
        {
          label: "Free shipping",
          detail: "On orders over ₹2,000",
          icon: "shipping",
        },
        {
          label: "30-day returns",
          detail: "No-questions-asked",
          icon: "returns",
        },
        {
          label: "Secure payment",
          detail: "Encrypted checkout",
          icon: "secure",
        },
        { label: "We're here", detail: "Mon–Sat support", icon: "support" },
      ],
    }),
    block("newsletter", {
      title: "Join the list",
      subtitle: "Occasional updates — no spam.",
      cta: "Subscribe",
      variant: "inline",
    }),
  ];
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const TEMPLATE_BLUEPRINTS: Record<string, TemplateBlueprint> = {
  editorial: {
    slug: "editorial",
    layouts: {
      home: editorialHome(),
      "products-index": productsIndexLayout(),
      "product-detail": editorialPdp(),
    },
    defaultThemeTokens: {
      mode: "light",
      colors: {
        primary: "#1a1a2e",
        secondary: "#4a4a6a",
        accent: "#f0ebe3",
        background: "#fdfcfa",
        surface: "#f5f3ef",
        text: "#1a1a2e",
        muted: "#6b7280",
        border: "#e5e0d8",
        ring: "#1a1a2e",
        onPrimary: "#ffffff",
      },
      typography: {
        heading: { family: "Georgia, 'Times New Roman', serif" },
        body: { family: "system-ui, sans-serif" },
        scaleRatio: 1.25,
        baseSize: 16,
      },
      shape: { radius: "soft", buttonStyle: "solid" },
    },
  },
  organic: {
    slug: "organic",
    layouts: {
      home: organicHome(),
      "products-index": productsIndexLayout(),
      "product-detail": organicPdp(),
    },
    defaultThemeTokens: {
      mode: "light",
      colors: {
        primary: "#3d5a3d",
        secondary: "#6b8e6b",
        accent: "#f5f0e8",
        background: "#faf8f3",
        surface: "#f0ede5",
        text: "#2d2d2d",
        muted: "#7a7a6e",
        border: "#e0dbd0",
        ring: "#3d5a3d",
        onPrimary: "#ffffff",
      },
      typography: {
        heading: { family: "Georgia, 'Times New Roman', serif" },
        body: { family: "system-ui, sans-serif" },
        scaleRatio: 1.2,
        baseSize: 16,
      },
      shape: { radius: "rounded", buttonStyle: "solid" },
    },
  },
  dark: {
    slug: "dark",
    layouts: {
      home: darkHome(),
      "products-index": productsIndexLayout(),
      "product-detail": darkPdp(),
    },
    defaultThemeTokens: {
      mode: "dark",
      colors: {
        primary: "#e0e0e0",
        secondary: "#888888",
        accent: "#1a1a2e",
        background: "#0a0a0a",
        surface: "#141414",
        text: "#e8e8e8",
        muted: "#777777",
        border: "#2a2a2a",
        ring: "#e0e0e0",
        onPrimary: "#0a0a0a",
      },
      typography: {
        heading: { family: "system-ui, sans-serif" },
        body: { family: "system-ui, sans-serif" },
        scaleRatio: 1.3,
        baseSize: 16,
      },
      shape: { radius: "soft", buttonStyle: "solid" },
    },
  },
  brutalist: {
    slug: "brutalist",
    layouts: {
      home: brutalistHome(),
      "products-index": productsIndexLayout(),
      "product-detail": brutalistPdp(),
    },
    defaultThemeTokens: {
      mode: "light",
      colors: {
        primary: "#000000",
        secondary: "#333333",
        accent: "#ffff00",
        background: "#ffffff",
        surface: "#f5f5f5",
        text: "#000000",
        muted: "#666666",
        border: "#000000",
        ring: "#000000",
        onPrimary: "#ffffff",
      },
      typography: {
        heading: {
          family: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
        },
        body: {
          family: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
        },
        scaleRatio: 1.2,
        baseSize: 15,
      },
      shape: { radius: "sharp", buttonStyle: "outline" },
    },
  },
  zen: {
    slug: "zen",
    layouts: {
      home: zenHome(),
      "products-index": productsIndexLayout(),
      "product-detail": zenPdp(),
    },
    defaultThemeTokens: {
      mode: "light",
      colors: {
        primary: "#4a4a4a",
        secondary: "#8a8a8a",
        accent: "#f5f2ed",
        background: "#faf9f7",
        surface: "#f2f0ec",
        text: "#333333",
        muted: "#999999",
        border: "#e8e5e0",
        ring: "#4a4a4a",
        onPrimary: "#ffffff",
      },
      typography: {
        heading: { family: "Georgia, 'Times New Roman', serif" },
        body: { family: "system-ui, sans-serif" },
        scaleRatio: 1.2,
        baseSize: 16,
      },
      shape: { radius: "soft", buttonStyle: "solid" },
      spacing: { section: "spacious" },
    },
  },
  coastal: {
    slug: "coastal",
    layouts: {
      home: coastalHome(),
      "products-index": productsIndexLayout(),
      "product-detail": coastalPdp(),
    },
    defaultThemeTokens: {
      mode: "light",
      colors: {
        primary: "#2563eb",
        secondary: "#60a5fa",
        accent: "#f0f7ff",
        background: "#ffffff",
        surface: "#f8fafc",
        text: "#1e293b",
        muted: "#64748b",
        border: "#e2e8f0",
        ring: "#2563eb",
        onPrimary: "#ffffff",
      },
      typography: {
        heading: { family: "system-ui, sans-serif" },
        body: { family: "system-ui, sans-serif" },
        scaleRatio: 1.25,
        baseSize: 16,
      },
      shape: { radius: "rounded", buttonStyle: "solid" },
    },
  },
  apothecary: {
    slug: "apothecary",
    layouts: {
      home: apothecaryHome(),
      "products-index": productsIndexLayout(),
      "product-detail": apothecaryPdp(),
    },
    defaultThemeTokens: {
      mode: "light",
      colors: {
        primary: "#5c6b4f",
        secondary: "#8a9a7b",
        accent: "#f5f0e0",
        background: "#faf7f0",
        surface: "#f0ece0",
        text: "#3d3028",
        muted: "#7a7060",
        border: "#ddd5c5",
        ring: "#5c6b4f",
        onPrimary: "#ffffff",
      },
      typography: {
        heading: { family: "Georgia, 'Times New Roman', serif" },
        body: { family: "system-ui, sans-serif" },
        scaleRatio: 1.25,
        baseSize: 16,
      },
      shape: { radius: "soft", buttonStyle: "solid" },
    },
  },
  retro: {
    slug: "retro",
    layouts: {
      home: retroHome(),
      "products-index": productsIndexLayout(),
      "product-detail": retroPdp(),
    },
    defaultThemeTokens: {
      mode: "light",
      colors: {
        primary: "#e63946",
        secondary: "#f4a261",
        accent: "#fff3e0",
        background: "#fff8f0",
        surface: "#ffecd2",
        text: "#2d1810",
        muted: "#8a6a5a",
        border: "#e8d5c0",
        ring: "#e63946",
        onPrimary: "#ffffff",
      },
      typography: {
        heading: { family: "system-ui, sans-serif" },
        body: { family: "system-ui, sans-serif" },
        scaleRatio: 1.3,
        baseSize: 16,
      },
      shape: { radius: "rounded", buttonStyle: "pill" },
    },
  },
  artisan: {
    slug: "artisan",
    layouts: {
      home: artisanHome(),
      "products-index": productsIndexLayout(),
      "product-detail": artisanPdp(),
    },
    defaultThemeTokens: {
      mode: "light",
      colors: {
        primary: "#6b4423",
        secondary: "#a0784c",
        accent: "#f5efe8",
        background: "#fdfaf5",
        surface: "#f5efe5",
        text: "#2d1810",
        muted: "#8a7060",
        border: "#e0d5c8",
        ring: "#6b4423",
        onPrimary: "#ffffff",
      },
      typography: {
        heading: { family: "Georgia, 'Times New Roman', serif" },
        body: { family: "system-ui, sans-serif" },
        scaleRatio: 1.25,
        baseSize: 16,
      },
      shape: { radius: "soft", buttonStyle: "solid" },
    },
  },
  gallery: {
    slug: "gallery",
    layouts: {
      home: galleryHome(),
      "products-index": productsIndexLayout(),
      "product-detail": galleryPdp(),
    },
    defaultThemeTokens: {
      mode: "light",
      colors: {
        primary: "#1a1a1a",
        secondary: "#666666",
        accent: "#f5f5f5",
        background: "#ffffff",
        surface: "#fafafa",
        text: "#1a1a1a",
        muted: "#888888",
        border: "#eeeeee",
        ring: "#1a1a1a",
        onPrimary: "#ffffff",
      },
      typography: {
        heading: { family: "system-ui, sans-serif" },
        body: { family: "system-ui, sans-serif" },
        scaleRatio: 1.2,
        baseSize: 16,
      },
      shape: { radius: "sharp", buttonStyle: "solid" },
    },
  },
  blank: {
    slug: "blank",
    layouts: {
      home: blankHome(),
      "products-index": productsIndexLayout(),
      "product-detail": blankPdp(),
    },
  },
};

/**
 * Look up the blueprint for a template slug. Returns null for unknown
 * slugs (new templates added to the DB before a blueprint is registered
 * here — fall back to the editor's empty-tree state, which is better than
 * crashing the pick-template flow).
 */
export function getTemplateBlueprint(
  slug: string | null | undefined,
): TemplateBlueprint | null {
  if (!slug) return null;
  return TEMPLATE_BLUEPRINTS[slug] ?? null;
}

export const BLUEPRINT_SCOPES = [
  "home",
  "products-index",
  "product-detail",
] as const satisfies readonly BlueprintScope[];
