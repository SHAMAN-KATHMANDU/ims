import type { PrismaClient, Prisma } from "@prisma/client";

/**
 * Platform-level catalog of website templates tenants can pick from.
 * Idempotent upsert keyed by slug.
 *
 * Phase C: `tier` enum is gone. Templates now carry a free-text `category`
 * string so new categories (editorial / dark / brutalist / ...) can be added
 * without a schema migration, and `defaultPages` JSON so the template can
 * suggest which top-level pages should be on by default.
 */

type TemplateSeed = {
  slug: string;
  name: string;
  description: string;
  category: string;
  previewImageUrl: string | null;
  defaultBranding: Prisma.InputJsonValue;
  defaultSections: Prisma.InputJsonValue;
  defaultPages: Prisma.InputJsonValue;
  sortOrder: number;
};

/**
 * The full default-branding shape templates emit.
 *
 *   colors: 9 tokens (primary, secondary, accent, background, surface, text,
 *           muted, border, ring) — all optional, render as CSS variables.
 *   typography: { heading, body, display, scaleRatio, baseFontSize }
 *   spacing: { base, sectionPadding: "compact" | "balanced" | "spacious" }
 *   radius: "sharp" | "soft" | "rounded"
 *   theme: "light" | "dark"
 *
 * This shape is documented in docs/TENANT-WEBSITES.md §20 (template catalog).
 * Phase C.2 will widen the renderer's `brandingToCssVars` to consume every
 * token; until then the older Phase-A templates only read `colors.primary`
 * and `theme`, and the new tokens are forward-compatible noise.
 */

const DEFAULT_PAGES = {
  home: true,
  products: true,
  blog: true,
  contact: true,
};

// The 4 Phase-A placeholder templates (minimal/standard/luxury/boutique) were
// removed in favour of the 10 bespoke Phase-C.4 layouts below. The seed runner
// repoints any SiteConfig pointing at a deprecated slug to `editorial` and
// then deletes the SiteTemplate rows. See `cleanupDeprecatedTemplates` below.
const DEPRECATED_TEMPLATE_SLUGS = [
  "minimal",
  "standard",
  "luxury",
  "boutique",
] as const;

const TEMPLATES: TemplateSeed[] = [
  {
    slug: "editorial",
    name: "Editorial",
    description:
      "Magazine-style. Serif display, asymmetric newspaper grid, cover-story hero. Best for brands that want to feel like a print publication.",
    category: "editorial",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#1A1A1A",
        secondary: "#4A4A4A",
        accent: "#C8A45C",
        background: "#FBF9F4",
        surface: "#F4F1E8",
        text: "#1A1A1A",
        muted: "#7A7466",
        border: "#E5E0D1",
        ring: "#1A1A1A",
      },
      typography: {
        heading: "Cormorant Garamond",
        body: "Source Sans 3",
        display: "Cormorant Garamond",
        scaleRatio: 1.333,
        baseFontSize: 17,
      },
      spacing: { base: 4, sectionPadding: "spacious" },
      radius: "sharp",
      theme: "light",
    },
    defaultSections: {
      hero: true,
      products: true,
      categories: true,
      story: true,
      articles: true,
      contact: true,
      newsletter: false,
    },
    defaultPages: DEFAULT_PAGES,
    sortOrder: 11,
  },
  {
    slug: "brutalist",
    name: "Brutalist",
    description:
      "Monospace, hard edges, exposed grid lines. Loud, opinionated, instantly recognisable. Best for zines, indie streetwear, anyone with strong opinions.",
    category: "brutalist",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#000000",
        secondary: "#333333",
        accent: "#FF4500",
        background: "#F5F5F0",
        surface: "#E8E8DF",
        text: "#000000",
        muted: "#5A5A52",
        border: "#000000",
        ring: "#FF4500",
      },
      typography: {
        heading: "JetBrains Mono",
        body: "JetBrains Mono",
        display: "JetBrains Mono",
        scaleRatio: 1.25,
        baseFontSize: 15,
      },
      spacing: { base: 4, sectionPadding: "balanced" },
      radius: "sharp",
      theme: "light",
    },
    defaultSections: {
      hero: true,
      products: true,
      categories: false,
      articles: true,
      contact: true,
      newsletter: false,
    },
    defaultPages: DEFAULT_PAGES,
    sortOrder: 12,
  },
  {
    slug: "zen",
    name: "Zen",
    description:
      "Japanese-inspired. Generous whitespace, thin type, muted palette, slow rhythm. Best for ceramics, tea, stationery, craft shops.",
    category: "zen",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#2E2E2E",
        secondary: "#4D4D4D",
        accent: "#A6947C",
        background: "#F8F6F1",
        surface: "#F0EDE4",
        text: "#2E2E2E",
        muted: "#8B8578",
        border: "#E0DAC9",
        ring: "#A6947C",
      },
      typography: {
        heading: "Noto Serif JP",
        body: "Inter",
        display: "Noto Serif JP",
        scaleRatio: 1.2,
        baseFontSize: 16,
      },
      spacing: { base: 4, sectionPadding: "spacious" },
      radius: "sharp",
      theme: "light",
    },
    defaultSections: {
      hero: true,
      products: true,
      categories: false,
      story: true,
      articles: true,
      contact: true,
      newsletter: false,
    },
    defaultPages: DEFAULT_PAGES,
    sortOrder: 13,
  },
  {
    slug: "coastal",
    name: "Coastal",
    description:
      "Breezy blue and white, light serif, airy spacing. Best for linen, beachwear, resortwear, and travel brands.",
    category: "coastal",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#2F5B7C",
        secondary: "#4A7A9A",
        accent: "#F5C35C",
        background: "#FAFBFC",
        surface: "#EDF2F7",
        text: "#1A2B3C",
        muted: "#6A7A8A",
        border: "#D6DFE7",
        ring: "#2F5B7C",
      },
      typography: {
        heading: "Georgia",
        body: "Inter",
        display: "Georgia",
        scaleRatio: 1.25,
        baseFontSize: 17,
      },
      spacing: { base: 4, sectionPadding: "balanced" },
      radius: "soft",
      theme: "light",
    },
    defaultSections: {
      hero: true,
      products: true,
      categories: true,
      articles: true,
      contact: true,
      newsletter: true,
    },
    defaultPages: DEFAULT_PAGES,
    sortOrder: 21,
  },
  {
    slug: "retro",
    name: "Retro",
    description:
      "70s and 80s revival. Bold colors, chunky type, rounded pills. Best for vinyl, skate, streetwear, kitsch homeware.",
    category: "retro",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#E63946",
        secondary: "#D62828",
        accent: "#FFD166",
        background: "#FFF8EC",
        surface: "#FCE9C4",
        text: "#1D1A1A",
        muted: "#5A4F4A",
        border: "#E8D29C",
        ring: "#E63946",
      },
      typography: {
        heading: "Helvetica Neue",
        body: "Helvetica Neue",
        display: "Helvetica Neue",
        scaleRatio: 1.333,
        baseFontSize: 16,
      },
      spacing: { base: 4, sectionPadding: "balanced" },
      radius: "rounded",
      theme: "light",
    },
    defaultSections: {
      hero: true,
      products: true,
      categories: false,
      trust: true,
      articles: true,
      contact: true,
      newsletter: true,
    },
    defaultPages: DEFAULT_PAGES,
    sortOrder: 22,
  },
  {
    slug: "dark",
    name: "Dark",
    description:
      "Pure dark mode with neon accents and a bento-style product showcase. Best for gaming, audio gear, streetwear, tech accessories.",
    category: "dark",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#00E5A0",
        secondary: "#00C088",
        accent: "#FF2E88",
        background: "#0A0A0A",
        surface: "#141414",
        text: "#F5F5F5",
        muted: "#9CA3AF",
        border: "#2A2A2A",
        ring: "#00E5A0",
      },
      typography: {
        heading: "Inter",
        body: "Inter",
        display: "Inter",
        scaleRatio: 1.25,
        baseFontSize: 16,
      },
      spacing: { base: 4, sectionPadding: "balanced" },
      radius: "soft",
      theme: "dark",
    },
    defaultSections: {
      hero: true,
      products: true,
      categories: false,
      bento: true,
      trust: true,
      articles: true,
      contact: true,
      newsletter: true,
    },
    defaultPages: DEFAULT_PAGES,
    sortOrder: 31,
  },
  {
    slug: "gallery",
    name: "Gallery",
    description:
      "Product-as-art. Minimal chrome, oversized imagery, bento showcase, exhibition-style typography. Best for limited-run design objects, prints, fine art.",
    category: "gallery",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#1A1A1A",
        secondary: "#3A3A3A",
        accent: "#D9B382",
        background: "#F7F5F0",
        surface: "#EDEBE4",
        text: "#1A1A1A",
        muted: "#7A7A72",
        border: "#DCD9CF",
        ring: "#1A1A1A",
      },
      typography: {
        heading: "Inter",
        body: "Inter",
        display: "Inter",
        scaleRatio: 1.2,
        baseFontSize: 16,
      },
      spacing: { base: 4, sectionPadding: "spacious" },
      radius: "sharp",
      theme: "light",
    },
    defaultSections: {
      hero: true,
      products: true,
      categories: false,
      bento: true,
      articles: true,
      contact: true,
      newsletter: false,
    },
    defaultPages: DEFAULT_PAGES,
    sortOrder: 32,
  },
  {
    slug: "organic",
    name: "Organic",
    description:
      "Warm earth tones, lifestyle-first, gentle curves, trust strip. Best for natural, handcrafted, or wellness brands.",
    category: "organic",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#4A6B3A",
        secondary: "#6B8A5A",
        accent: "#E8D4A8",
        background: "#FAF6EF",
        surface: "#F0E9DB",
        text: "#2D3B24",
        muted: "#6B6B5A",
        border: "#DDD4BF",
        ring: "#4A6B3A",
      },
      typography: {
        heading: "Lora",
        body: "Inter",
        display: "Lora",
        scaleRatio: 1.25,
        baseFontSize: 17,
      },
      spacing: { base: 4, sectionPadding: "balanced" },
      radius: "soft",
      theme: "light",
    },
    defaultSections: {
      hero: true,
      trust: true,
      products: true,
      story: true,
      articles: true,
      contact: true,
      newsletter: true,
    },
    defaultPages: DEFAULT_PAGES,
    sortOrder: 41,
  },
  {
    slug: "apothecary",
    name: "Apothecary",
    description:
      "Cream and sage with pharmacy-counter nostalgia. Trust-led, story-driven, monthly-bulletin newsletter. Best for skincare, candles, herbal goods, perfume.",
    category: "apothecary",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#3E5B4A",
        secondary: "#5A7A68",
        accent: "#E8D9B8",
        background: "#F6F1E4",
        surface: "#EEE5D0",
        text: "#2B3B2E",
        muted: "#6A7A66",
        border: "#DBCFB2",
        ring: "#3E5B4A",
      },
      typography: {
        heading: "Cormorant Garamond",
        body: "Lora",
        display: "Cormorant Garamond",
        scaleRatio: 1.25,
        baseFontSize: 17,
      },
      spacing: { base: 4, sectionPadding: "balanced" },
      radius: "soft",
      theme: "light",
    },
    defaultSections: {
      hero: true,
      trust: true,
      products: true,
      story: true,
      articles: true,
      contact: true,
      newsletter: true,
    },
    defaultPages: DEFAULT_PAGES,
    sortOrder: 42,
  },
  {
    slug: "artisan",
    name: "Artisan",
    description:
      "Heritage crafts, story-first, warm greens — inspired by the shamanktm reference. The densest layout: trust, category tiles, workshop grid, founder story, newsletter. Best for folk art, handmade goods, spiritual stores.",
    category: "artisan",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#3A7A1A",
        secondary: "#5A9A3A",
        accent: "#C9A75A",
        background: "#FDFCF7",
        surface: "#F4EFE0",
        text: "#1A3A0A",
        muted: "#5A6A4A",
        border: "#DED7BE",
        ring: "#3A7A1A",
      },
      typography: {
        heading: "Cormorant Garamond",
        body: "Montserrat",
        display: "Cormorant Garamond",
        scaleRatio: 1.25,
        baseFontSize: 17,
      },
      spacing: { base: 4, sectionPadding: "balanced" },
      radius: "soft",
      theme: "light",
    },
    defaultSections: {
      hero: true,
      trust: true,
      categories: true,
      products: true,
      story: true,
      articles: true,
      contact: true,
      newsletter: true,
    },
    defaultPages: DEFAULT_PAGES,
    sortOrder: 43,
  },
];

/**
 * Repoint any SiteConfig still using a deprecated template slug to `editorial`
 * (the new default), then delete the deprecated SiteTemplate rows. Idempotent:
 * if the deprecated rows are already gone this is a no-op.
 */
async function cleanupDeprecatedTemplates(
  prisma: PrismaClient,
  editorialId: string,
): Promise<void> {
  const deprecated = await prisma.siteTemplate.findMany({
    where: { slug: { in: [...DEPRECATED_TEMPLATE_SLUGS] } },
    select: { id: true, slug: true },
  });
  if (deprecated.length === 0) return;

  const deprecatedIds = deprecated.map((t) => t.id);
  const repointed = await prisma.siteConfig.updateMany({
    where: { templateId: { in: deprecatedIds } },
    data: { templateId: editorialId },
  });
  await prisma.siteTemplate.deleteMany({
    where: { id: { in: deprecatedIds } },
  });
  console.log(
    `  ✓ Removed ${deprecated.length} deprecated templates (${deprecated
      .map((t) => t.slug)
      .join(", ")}); repointed ${repointed.count} site config(s) to editorial`,
  );
}

export async function seedSiteTemplates(prisma: PrismaClient): Promise<void> {
  for (const t of TEMPLATES) {
    await prisma.siteTemplate.upsert({
      where: { slug: t.slug },
      create: {
        slug: t.slug,
        name: t.name,
        description: t.description,
        category: t.category,
        previewImageUrl: t.previewImageUrl,
        defaultBranding: t.defaultBranding,
        defaultSections: t.defaultSections,
        defaultPages: t.defaultPages,
        isActive: true,
        sortOrder: t.sortOrder,
      },
      update: {
        name: t.name,
        description: t.description,
        category: t.category,
        previewImageUrl: t.previewImageUrl,
        defaultBranding: t.defaultBranding,
        defaultSections: t.defaultSections,
        defaultPages: t.defaultPages,
        sortOrder: t.sortOrder,
      },
    });
  }

  const editorial = await prisma.siteTemplate.findUnique({
    where: { slug: "editorial" },
    select: { id: true },
  });
  if (editorial) {
    await cleanupDeprecatedTemplates(prisma, editorial.id);
  }

  console.log(`  ✓ Site templates (${TEMPLATES.length})`);
}
