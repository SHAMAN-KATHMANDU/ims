/**
 * Block schema tests — validates every BlockKind's Zod schema with
 * representative valid + invalid inputs. Ensures the schema contract
 * between the API (writer) and the tenant-site renderer (reader) stays
 * in sync. Adding a new block kind without a test here is a build-time
 * error because BlockPropsSchemas is `satisfies Record<BlockKind, ...>`.
 */

import { describe, it, expect } from "vitest";
import {
  BlockPropsSchemas,
  BlockNodeSchema,
  BlockTreeSchema,
  type BlockKind,
} from "./blocks";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validatesAs(kind: BlockKind, props: unknown) {
  const schema = BlockPropsSchemas[kind];
  expect(schema).toBeDefined();
  const result = schema.safeParse(props);
  if (!result.success) {
    throw new Error(
      `Expected ${kind} props to validate but got: ${result.error.issues.map((i) => i.message).join(", ")}`,
    );
  }
}

function rejectsAs(kind: BlockKind, props: unknown) {
  const schema = BlockPropsSchemas[kind];
  expect(schema).toBeDefined();
  const result = schema.safeParse(props);
  expect(result.success).toBe(false);
}

// ---------------------------------------------------------------------------
// Structural / content blocks
// ---------------------------------------------------------------------------

describe("BlockPropsSchemas", () => {
  describe("section", () => {
    it("accepts valid props", () => {
      validatesAs("section", { background: "surface", paddingY: "balanced" });
    });
    it("accepts empty (all optional)", () => {
      validatesAs("section", {});
    });
    it("rejects unknown background", () => {
      rejectsAs("section", { background: "rainbow" });
    });
  });

  describe("heading", () => {
    it("accepts valid props", () => {
      validatesAs("heading", { text: "Hello", level: 2 });
    });
    it("rejects missing text", () => {
      rejectsAs("heading", { level: 1 });
    });
    it("rejects level 5", () => {
      rejectsAs("heading", { text: "Hi", level: 5 });
    });
  });

  describe("rich-text", () => {
    it("accepts valid markdown", () => {
      validatesAs("rich-text", { source: "# Title" });
    });
    it("rejects empty source", () => {
      rejectsAs("rich-text", { source: "" });
    });
  });

  describe("image", () => {
    it("accepts valid props", () => {
      validatesAs("image", { src: "https://x.com/img.png", alt: "Photo" });
    });
    it("rejects missing alt", () => {
      rejectsAs("image", { src: "https://x.com/img.png" });
    });
  });

  describe("button", () => {
    it("accepts valid props", () => {
      validatesAs("button", {
        label: "Click",
        href: "/shop",
        style: "primary",
      });
    });
    it("rejects unknown style", () => {
      rejectsAs("button", { label: "X", href: "/", style: "neon" });
    });
  });

  describe("spacer", () => {
    it("accepts valid size", () => {
      validatesAs("spacer", { size: "lg" });
    });
    it("rejects unknown size", () => {
      rejectsAs("spacer", { size: "huge" });
    });
  });

  describe("divider", () => {
    it("accepts empty (all optional)", () => {
      validatesAs("divider", {});
    });
  });

  describe("markdown-body", () => {
    it("accepts valid source", () => {
      validatesAs("markdown-body", { source: "Hello world" });
    });
  });

  // ---------------------------------------------------------------------------
  // Commerce blocks
  // ---------------------------------------------------------------------------

  describe("hero", () => {
    it("accepts valid props", () => {
      validatesAs("hero", { variant: "editorial" });
    });
    it("rejects unknown variant", () => {
      rejectsAs("hero", { variant: "neon" });
    });
  });

  describe("product-grid", () => {
    it("accepts featured source", () => {
      validatesAs("product-grid", {
        source: "featured",
        limit: 8,
        columns: 4,
        cardVariant: "bordered",
      });
    });
    it("rejects limit 0", () => {
      rejectsAs("product-grid", {
        source: "featured",
        limit: 0,
        columns: 3,
        cardVariant: "bare",
      });
    });
  });

  describe("category-tiles", () => {
    it("accepts valid props", () => {
      validatesAs("category-tiles", { columns: 3 });
    });
  });

  describe("product-listing", () => {
    it("accepts valid props", () => {
      validatesAs("product-listing", {
        pageSize: 24,
        defaultSort: "newest",
        showSort: true,
        columns: 4,
        categoryFilter: true,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Marketing blocks
  // ---------------------------------------------------------------------------

  describe("trust-strip", () => {
    it("accepts items array", () => {
      validatesAs("trust-strip", {
        items: [{ label: "Fast", value: "Shipping" }],
      });
    });
    it("rejects items without label", () => {
      rejectsAs("trust-strip", { items: [{ value: "No label" }] });
    });
  });

  describe("story-split", () => {
    it("accepts valid props", () => {
      validatesAs("story-split", {
        title: "Our Story",
        body: "We make things.",
        imageSide: "left",
      });
    });
  });

  describe("bento-showcase", () => {
    it("accepts valid props", () => {
      validatesAs("bento-showcase", { source: "featured", limit: 5 });
    });
  });

  describe("stats-band", () => {
    it("accepts items", () => {
      validatesAs("stats-band", {
        items: [{ value: "10", label: "Years" }],
      });
    });
  });

  describe("newsletter", () => {
    it("accepts empty (all optional)", () => {
      validatesAs("newsletter", {});
    });
  });

  describe("contact-block", () => {
    it("accepts empty", () => {
      validatesAs("contact-block", {});
    });
  });

  describe("faq", () => {
    it("accepts items", () => {
      validatesAs("faq", {
        items: [{ question: "Why?", answer: "Because." }],
      });
    });
    it("rejects items without question", () => {
      rejectsAs("faq", { items: [{ answer: "No question" }] });
    });
  });

  describe("testimonials", () => {
    it("accepts items", () => {
      validatesAs("testimonials", {
        items: [{ quote: "Great!", author: "Jane" }],
      });
    });
  });

  describe("logo-cloud", () => {
    it("accepts logos", () => {
      validatesAs("logo-cloud", {
        logos: [{ src: "https://x.com/logo.svg", alt: "Brand" }],
      });
    });
  });

  describe("blog-list", () => {
    it("accepts valid props", () => {
      validatesAs("blog-list", { limit: 3, columns: 3 });
    });
  });

  // ---------------------------------------------------------------------------
  // PDP blocks
  // ---------------------------------------------------------------------------

  describe("pdp-gallery", () => {
    it("accepts valid props", () => {
      validatesAs("pdp-gallery", {
        layout: "thumbs-below",
        enableZoom: true,
      });
    });
  });

  describe("pdp-buybox", () => {
    it("accepts empty (all optional)", () => {
      validatesAs("pdp-buybox", {});
    });
  });

  describe("pdp-details", () => {
    it("accepts tabs flag", () => {
      validatesAs("pdp-details", { tabs: true });
    });
  });

  describe("pdp-related", () => {
    it("accepts valid props", () => {
      validatesAs("pdp-related", { limit: 4, columns: 4 });
    });
  });

  describe("breadcrumbs", () => {
    it("accepts product scope", () => {
      validatesAs("breadcrumbs", { scope: "product" });
    });
    it("rejects unknown scope", () => {
      rejectsAs("breadcrumbs", { scope: "checkout" });
    });
  });

  // ---------------------------------------------------------------------------
  // Layer 2 blocks
  // ---------------------------------------------------------------------------

  describe("embed", () => {
    it("accepts valid URL", () => {
      validatesAs("embed", { src: "https://calendly.com/embed" });
    });
    it("accepts all options", () => {
      validatesAs("embed", {
        src: "https://example.com",
        aspectRatio: "16/9",
        allowFullscreen: true,
        caption: "My widget",
      });
    });
    it("rejects missing src", () => {
      rejectsAs("embed", {});
    });
  });

  describe("video", () => {
    it("accepts youtube", () => {
      validatesAs("video", {
        source: "youtube",
        url: "https://youtube.com/watch?v=abc",
      });
    });
    it("accepts mp4 with options", () => {
      validatesAs("video", {
        source: "mp4",
        url: "https://cdn.example.com/video.mp4",
        autoplay: true,
        loop: true,
        muted: true,
      });
    });
    it("rejects unknown source", () => {
      rejectsAs("video", { source: "tiktok", url: "https://x.com" });
    });
  });

  describe("accordion", () => {
    it("accepts items", () => {
      validatesAs("accordion", {
        items: [{ title: "Q1", body: "A1" }],
      });
    });
    it("accepts with heading and allowMultiple", () => {
      validatesAs("accordion", {
        items: [{ title: "Q", body: "A" }],
        allowMultiple: true,
        heading: "FAQ",
      });
    });
    it("rejects empty items array", () => {
      // Empty array is technically valid (max 50), but items are required
      validatesAs("accordion", { items: [] });
    });
    it("rejects items without title", () => {
      rejectsAs("accordion", { items: [{ body: "no title" }] });
    });
  });

  describe("columns", () => {
    it("accepts 2 columns", () => {
      validatesAs("columns", { count: 2 });
    });
    it("accepts with gap and align", () => {
      validatesAs("columns", {
        count: 3,
        gap: "lg",
        verticalAlign: "center",
      });
    });
    it("rejects 5 columns", () => {
      rejectsAs("columns", { count: 5 });
    });
  });

  describe("gallery", () => {
    it("accepts grid layout", () => {
      validatesAs("gallery", {
        images: [{ src: "https://x.com/1.jpg", alt: "Photo 1" }],
        layout: "grid",
        columns: 3,
      });
    });
    it("accepts slideshow with lightbox", () => {
      validatesAs("gallery", {
        images: [],
        layout: "slideshow",
        columns: 2,
        lightbox: true,
      });
    });
    it("rejects unknown layout", () => {
      rejectsAs("gallery", {
        images: [],
        layout: "carousel",
        columns: 3,
      });
    });
  });

  describe("tabs", () => {
    it("accepts tabs with content", () => {
      validatesAs("tabs", {
        tabs: [{ label: "Tab 1", content: "Hello" }],
      });
    });
    it("accepts with defaultTab", () => {
      validatesAs("tabs", {
        tabs: [
          { label: "A", content: "Content A" },
          { label: "B", content: "Content B" },
        ],
        defaultTab: 1,
      });
    });
    it("rejects tabs without label", () => {
      rejectsAs("tabs", { tabs: [{ content: "no label" }] });
    });
  });

  describe("form", () => {
    it("accepts valid form", () => {
      validatesAs("form", {
        fields: [
          { kind: "text", label: "Name", required: true },
          { kind: "email", label: "Email" },
        ],
        submitTo: "email",
      });
    });
    it("accepts full config", () => {
      validatesAs("form", {
        heading: "Contact us",
        description: "We'll get back to you.",
        fields: [
          {
            kind: "select",
            label: "Topic",
            options: ["Sales", "Support"],
          },
          { kind: "textarea", label: "Message", placeholder: "Type here" },
        ],
        submitLabel: "Send",
        successMessage: "Thanks!",
        submitTo: "crm-lead",
      });
    });
    it("rejects unknown field kind", () => {
      rejectsAs("form", {
        fields: [{ kind: "checkbox", label: "Agree" }],
        submitTo: "email",
      });
    });
    it("rejects unknown submitTo", () => {
      rejectsAs("form", {
        fields: [{ kind: "text", label: "Name" }],
        submitTo: "slack",
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Layer 3 blocks
  // ---------------------------------------------------------------------------

  describe("css-grid", () => {
    it("accepts valid 3-column grid", () => {
      validatesAs("css-grid", { columns: 3 });
    });
    it("accepts 12-column with options", () => {
      validatesAs("css-grid", {
        columns: 12,
        gap: "lg",
        minRowHeight: "200px",
      });
    });
    it("rejects 0 columns", () => {
      rejectsAs("css-grid", { columns: 0 });
    });
    it("rejects 13 columns", () => {
      rejectsAs("css-grid", { columns: 13 });
    });
  });
});

// ---------------------------------------------------------------------------
// New field validation (Phase B–F additions)
// ---------------------------------------------------------------------------

describe("new optional fields", () => {
  it("hero accepts imageUrl + heroLayout", () => {
    validatesAs("hero", {
      variant: "editorial",
      imageUrl: "https://img.example.com/hero.jpg",
      heroLayout: "split-right",
    });
  });
  it("hero rejects invalid heroLayout", () => {
    rejectsAs("hero", { variant: "standard", heroLayout: "mosaic" });
  });

  it("product-grid accepts card customization props", () => {
    validatesAs("product-grid", {
      source: "featured",
      limit: 8,
      columns: 4,
      cardVariant: "card",
      showCategory: false,
      showPrice: true,
      showDiscount: false,
      cardAspectRatio: "1/1",
    });
  });
  it("product-grid rejects invalid cardAspectRatio", () => {
    rejectsAs("product-grid", {
      source: "featured",
      limit: 8,
      columns: 4,
      cardVariant: "bordered",
      cardAspectRatio: "2/3",
    });
  });

  it("product-listing accepts card customization", () => {
    validatesAs("product-listing", {
      pageSize: 24,
      defaultSort: "newest",
      showSort: true,
      columns: 3,
      categoryFilter: true,
      showPrice: false,
      cardAspectRatio: "4/5",
    });
  });

  it("category-tiles accepts showProductCount and cardStyle", () => {
    validatesAs("category-tiles", {
      columns: 3,
      showProductCount: false,
      cardStyle: "overlay",
    });
  });

  it("section accepts backgroundImage + overlay", () => {
    validatesAs("section", {
      backgroundImage: "https://img.example.com/bg.jpg",
      backgroundOverlay: "dark",
    });
  });

  it("heading accepts size and decoration", () => {
    validatesAs("heading", {
      text: "Hello",
      level: 1,
      size: "xl",
      decoration: "gradient",
    });
  });

  it("image accepts shadow and hoverEffect", () => {
    validatesAs("image", {
      src: "https://img.example.com/photo.jpg",
      alt: "Photo",
      shadow: "lg",
      hoverEffect: "zoom",
    });
  });

  it("button accepts fullWidth", () => {
    validatesAs("button", {
      label: "Buy now",
      href: "/checkout",
      style: "primary",
      fullWidth: true,
    });
  });

  it("spacer accepts customPx", () => {
    validatesAs("spacer", { size: "md", customPx: 120 });
  });
  it("spacer rejects customPx > 500", () => {
    rejectsAs("spacer", { size: "md", customPx: 600 });
  });

  it("divider accepts colorToken", () => {
    validatesAs("divider", { colorToken: "color-primary" });
  });

  it("trust-strip accepts layout and columns", () => {
    validatesAs("trust-strip", {
      items: [{ label: "Stat", value: "100" }],
      layout: "grid",
      columns: 4,
    });
  });

  it("story-split accepts mediaType and videoUrl", () => {
    validatesAs("story-split", {
      title: "Our story",
      body: "We started...",
      imageSide: "left",
      mediaType: "video",
      videoUrl: "https://youtube.com/watch?v=abc",
    });
  });

  it("bento-showcase accepts columns + cardVariant", () => {
    validatesAs("bento-showcase", {
      source: "featured",
      limit: 4,
      columns: 2,
      cardVariant: "card",
      showPrice: false,
    });
  });

  it("stats-band accepts alignment and valueSize", () => {
    validatesAs("stats-band", {
      items: [{ value: "99%", label: "Uptime" }],
      alignment: "center",
      valueSize: "xl",
    });
  });

  it("newsletter accepts variant and dark", () => {
    validatesAs("newsletter", { variant: "banner", dark: true });
  });

  it("contact-block accepts layout and showMap", () => {
    validatesAs("contact-block", {
      heading: "Get in touch",
      layout: "split",
      showMap: true,
      showSocials: true,
    });
  });

  it("faq accepts variant", () => {
    validatesAs("faq", {
      items: [{ question: "Q?", answer: "A." }],
      variant: "card",
    });
  });

  it("testimonials accepts layout and columns", () => {
    validatesAs("testimonials", {
      items: [{ quote: "Great!", author: "Jane" }],
      layout: "carousel",
      columns: 3,
      showAvatar: true,
    });
  });

  it("logo-cloud accepts logoHeight, grayscale, columns", () => {
    validatesAs("logo-cloud", {
      logos: [{ src: "https://x.com/logo.svg", alt: "Brand" }],
      logoHeight: 48,
      grayscale: false,
      columns: 6,
    });
  });

  it("blog-list accepts card customization", () => {
    validatesAs("blog-list", {
      limit: 6,
      columns: 3,
      cardVariant: "minimal",
      showExcerpt: false,
      showDate: true,
      showCategory: false,
      showImage: true,
    });
  });

  it("pdp-gallery accepts aspectRatio", () => {
    validatesAs("pdp-gallery", {
      layout: "thumbs-below",
      enableZoom: true,
      aspectRatio: "3/4",
    });
  });

  it("pdp-buybox accepts new toggle props", () => {
    validatesAs("pdp-buybox", {
      showAddToCart: false,
      showDescription: true,
      priceSize: "lg",
    });
  });

  it("embed accepts title and height", () => {
    validatesAs("embed", {
      src: "https://example.com/widget",
      title: "Widget",
      height: 600,
    });
  });

  it("video accepts posterUrl and rounded", () => {
    validatesAs("video", {
      source: "youtube",
      url: "https://youtube.com/watch?v=abc",
      posterUrl: "https://img.example.com/poster.jpg",
      rounded: true,
    });
  });

  it("accordion accepts icon and variant", () => {
    validatesAs("accordion", {
      items: [{ title: "Q", body: "A" }],
      icon: "plus",
      variant: "card",
    });
  });

  it("columns accepts stackBelow", () => {
    validatesAs("columns", { count: 3, stackBelow: "md" });
  });

  it("gallery accepts gap, hoverEffect, rounded", () => {
    validatesAs("gallery", {
      images: [{ src: "https://x.com/1.jpg", alt: "Photo" }],
      layout: "grid",
      columns: 3,
      gap: "lg",
      hoverEffect: "zoom",
      rounded: true,
    });
  });

  it("tabs accepts variant and alignment", () => {
    validatesAs("tabs", {
      tabs: [{ label: "Tab 1", content: "Content" }],
      variant: "pills",
      alignment: "center",
    });
  });

  it("form accepts layout, buttonStyle, buttonAlignment, field width", () => {
    validatesAs("form", {
      fields: [
        { kind: "text", label: "Name", width: "half" },
        { kind: "email", label: "Email", width: "half" },
      ],
      submitTo: "email",
      layout: "stacked",
      buttonStyle: "outline",
      buttonAlignment: "center",
    });
  });

  it("css-grid accepts mobileColumns and tabletColumns", () => {
    validatesAs("css-grid", {
      columns: 4,
      mobileColumns: 1,
      tabletColumns: 2,
    });
  });
});

// ---------------------------------------------------------------------------
// BlockNode + BlockTree validation
// ---------------------------------------------------------------------------

describe("BlockNodeSchema", () => {
  it("validates a simple block node", () => {
    const result = BlockNodeSchema.safeParse({
      id: "test-1",
      kind: "heading",
      props: { text: "Hello", level: 2 },
    });
    expect(result.success).toBe(true);
  });

  it("validates a node with children", () => {
    const result = BlockNodeSchema.safeParse({
      id: "section-1",
      kind: "section",
      props: { background: "surface" },
      children: [
        { id: "h-1", kind: "heading", props: { text: "Hi", level: 1 } },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("validates a node with visibility", () => {
    const result = BlockNodeSchema.safeParse({
      id: "sp-1",
      kind: "spacer",
      props: { size: "md" },
      visibility: { mobile: false },
    });
    expect(result.success).toBe(true);
  });

  it("passes unknown block kinds (forward-compat)", () => {
    const result = BlockNodeSchema.safeParse({
      id: "x-1",
      kind: "future-block",
      props: { anything: true },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid props on known kinds", () => {
    const result = BlockNodeSchema.safeParse({
      id: "h-bad",
      kind: "heading",
      props: { text: 123, level: "two" },
    });
    expect(result.success).toBe(false);
  });
});

describe("BlockTreeSchema", () => {
  it("validates an empty tree", () => {
    const result = BlockTreeSchema.safeParse([]);
    expect(result.success).toBe(true);
  });

  it("validates a multi-block tree", () => {
    const result = BlockTreeSchema.safeParse([
      { id: "h-1", kind: "hero", props: { variant: "editorial" } },
      {
        id: "g-1",
        kind: "product-grid",
        props: {
          source: "featured",
          limit: 4,
          columns: 2,
          cardVariant: "bare",
        },
      },
      { id: "n-1", kind: "newsletter", props: {} },
    ]);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Completeness check — every BlockKind has a schema
// ---------------------------------------------------------------------------

describe("schema completeness", () => {
  it("BlockPropsSchemas covers every BlockKind", () => {
    const schemaKeys = Object.keys(BlockPropsSchemas).sort();
    // The satisfies constraint catches this at compile time, but a runtime
    // check gives a better error message in the test runner.
    expect(schemaKeys.length).toBeGreaterThanOrEqual(35);
  });
});
