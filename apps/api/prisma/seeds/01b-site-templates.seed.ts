import type { PrismaClient, Prisma } from "@prisma/client";

/**
 * Platform-level catalog of website templates tenants can pick from.
 * Idempotent upsert keyed by slug.
 *
 * Phase D: replaces the prior 11-template catalog (editorial / brutalist /
 * zen / coastal / retro / dark / gallery / organic / apothecary / artisan /
 * blank) with 10 niche-targeted blueprints derived from the
 * Ecommerse Template design system. The runner repoints any SiteConfig on a
 * deprecated slug to its closest replacement, then deletes the deprecated
 * SiteTemplate rows.
 *
 * The 10 new templates are paired 1:1 with TemplateBlueprint exports under
 * `apps/api/src/modules/sites/templates/<slug>/`. Picking any of them seeds
 * 5 SiteLayout rows (home / products-index / product-detail / offers / cart)
 * via sites.service.seedLayoutsFromBlueprint().
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

const DEFAULT_PAGES = {
  home: true,
  products: true,
  blog: true,
  contact: true,
};

/**
 * Slugs from the previous template catalog that are no longer shipped.
 * Tenants on these slugs are repointed to their closest replacement (see
 * DEPRECATED_REPOINTS) and the deprecated SiteTemplate rows are deleted.
 */
const DEPRECATED_REPOINTS: Record<string, string> = {
  // Old Phase-A placeholders (already removed once but might linger in old DBs)
  minimal: "fold",
  standard: "fold",
  luxury: "auric",
  boutique: "auric",
  // Phase-C templates we're replacing in Phase-D
  editorial: "maison",
  organic: "verdant",
  dark: "volt",
  brutalist: "fold",
  zen: "auric",
  coastal: "lumen",
  apothecary: "pantry",
  retro: "pantry",
  artisan: "maison",
  gallery: "auric",
  // NOTE: "blank" is intentionally NOT in this map. SiteTemplatePicker
  // special-cases the "blank" slug ("Start from a blank canvas") and
  // expects the row to exist; we keep it seeded as a minimal template
  // below.
};

const TEMPLATES: TemplateSeed[] = [
  {
    slug: "maison",
    name: "Maison",
    description:
      "Editorial warmth. Oak-and-clay palette, full-bleed editorial heroes, generous Fraunces serif display. Best for interior design, furniture, and craft homeware.",
    category: "interior",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#2a241a",
        secondary: "#7a6845",
        accent: "#c9a672",
        background: "#f7f1e3",
        surface: "#ede4cc",
        text: "#2a241a",
        muted: "#7a6845",
        border: "#d9caa3",
        ring: "#2a241a",
      },
      typography: {
        heading: "Fraunces",
        body: "Inter",
        display: "Fraunces",
        scaleRatio: 1.25,
        baseFontSize: 16,
      },
      spacing: { base: 4, sectionPadding: "spacious" },
      radius: "sharp",
      theme: "light",
    },
    defaultSections: {
      hero: true,
      categories: true,
      story: true,
      products: true,
      testimonials: true,
      newsletter: true,
      contact: true,
    },
    defaultPages: DEFAULT_PAGES,
    sortOrder: 1,
  },
  {
    slug: "fold",
    name: "Fold",
    description:
      "Swiss grid, ruthless typography. White, black, and a single oxblood accent. Inter 800 display. Best for fashion, apparel, and footwear.",
    category: "fashion",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#0a0a0a",
        secondary: "#3a3a3a",
        accent: "#7a1c20",
        background: "#f5f5f3",
        surface: "#eceae5",
        text: "#0a0a0a",
        muted: "#6b6863",
        border: "#d8d4cb",
        ring: "#7a1c20",
      },
      typography: {
        heading: "Inter",
        body: "Inter",
        display: "Inter",
        scaleRatio: 1.333,
        baseFontSize: 15,
      },
      spacing: { base: 4, sectionPadding: "balanced" },
      radius: "sharp",
      theme: "light",
    },
    defaultSections: {
      hero: true,
      categories: true,
      products: true,
      story: true,
      newsletter: true,
      contact: true,
    },
    defaultPages: DEFAULT_PAGES,
    sortOrder: 2,
  },
  {
    slug: "forge",
    name: "Forge",
    description:
      "Data-dense industrial. Dark steel surface, hazard-amber accent, JetBrains Mono headings. Account bars, tier pricing, and tabular grids. Best for wholesale and B2B.",
    category: "wholesale",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#d4af3a",
        secondary: "#3d4148",
        accent: "#d4af3a",
        background: "#14171c",
        surface: "#1a1d22",
        text: "#e8e4d8",
        muted: "#8a8e96",
        border: "#2a2e35",
        ring: "#d4af3a",
      },
      typography: {
        heading: "Inter",
        body: "Inter",
        display: "JetBrains Mono",
        scaleRatio: 1.2,
        baseFontSize: 14,
      },
      spacing: { base: 4, sectionPadding: "compact" },
      radius: "sharp",
      theme: "dark",
    },
    defaultSections: {
      hero: true,
      stats: true,
      categories: true,
      products: true,
      trust: true,
      contact: true,
    },
    defaultPages: DEFAULT_PAGES,
    sortOrder: 3,
  },
  {
    slug: "lumen",
    name: "Lumen",
    description:
      "Soft blush gradients, italic Fraunces serif, generous whitespace. Pillows of product air. Best for beauty, cosmetics, and skincare.",
    category: "beauty",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#6b3f33",
        secondary: "#8a5e51",
        accent: "#ecc8b9",
        background: "#f5dfd2",
        surface: "#fbf4ee",
        text: "#6b3f33",
        muted: "#9a7a6f",
        border: "#e8c8b8",
        ring: "#6b3f33",
      },
      typography: {
        heading: "Fraunces",
        body: "Inter",
        display: "Fraunces",
        scaleRatio: 1.25,
        baseFontSize: 16,
      },
      spacing: { base: 4, sectionPadding: "balanced" },
      radius: "rounded",
      theme: "light",
    },
    defaultSections: {
      hero: true,
      categories: true,
      bento: true,
      testimonials: true,
      newsletter: true,
      contact: true,
    },
    defaultPages: DEFAULT_PAGES,
    sortOrder: 4,
  },
  {
    slug: "volt",
    name: "Volt",
    description:
      "Deep-night UI, lime accent, monospaced specs, glow-and-grid. JetBrains Mono accents. Best for electronics, gadgets, and audio gear.",
    category: "electronics",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#d6f25a",
        secondary: "#9aa3b0",
        accent: "#d6f25a",
        background: "#07090d",
        surface: "#15191f",
        text: "#e8eaf0",
        muted: "#9aa3b0",
        border: "#2a2f38",
        ring: "#d6f25a",
      },
      typography: {
        heading: "Inter",
        body: "Inter",
        display: "JetBrains Mono",
        scaleRatio: 1.2,
        baseFontSize: 14,
      },
      spacing: { base: 4, sectionPadding: "balanced" },
      radius: "soft",
      theme: "dark",
    },
    defaultSections: {
      hero: true,
      categories: true,
      products: true,
      story: true,
      stats: true,
      contact: true,
    },
    defaultPages: DEFAULT_PAGES,
    sortOrder: 5,
  },
  {
    slug: "auric",
    name: "Auric",
    description:
      "Cream-on-cream luxury. Hairline rules, italic Fraunces display, gold accent, museum-tier whitespace. Best for jewelry, accessories, and bridal.",
    category: "jewelry",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#2a1f17",
        secondary: "#6b4a1f",
        accent: "#b8924a",
        background: "#f5ede0",
        surface: "#fbf6ec",
        text: "#2a1f17",
        muted: "#9a8770",
        border: "#dcc69a",
        ring: "#b8924a",
      },
      typography: {
        heading: "Fraunces",
        body: "Inter",
        display: "Fraunces",
        scaleRatio: 1.25,
        baseFontSize: 16,
      },
      spacing: { base: 4, sectionPadding: "spacious" },
      radius: "sharp",
      theme: "light",
    },
    defaultSections: {
      hero: true,
      categories: true,
      story: true,
      products: true,
      testimonials: true,
      contact: true,
    },
    defaultPages: DEFAULT_PAGES,
    sortOrder: 6,
  },
  {
    slug: "pantry",
    name: "Pantry & Co.",
    description:
      "Hand-feel labels, warm reds, recipe-style PDP. Fraunces display. Built for olive oils, sauces, tins, and other gourmet pantry goods.",
    category: "food",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#b53626",
        secondary: "#3a4a2a",
        accent: "#b53626",
        background: "#f1e6d2",
        surface: "#ebd9b9",
        text: "#2a1a14",
        muted: "#6e5a48",
        border: "#d8c19d",
        ring: "#b53626",
      },
      typography: {
        heading: "Fraunces",
        body: "Inter",
        display: "Fraunces",
        scaleRatio: 1.25,
        baseFontSize: 16,
      },
      spacing: { base: 4, sectionPadding: "balanced" },
      radius: "soft",
      theme: "light",
    },
    defaultSections: {
      hero: true,
      categories: true,
      story: true,
      products: true,
      trust: true,
      newsletter: true,
      contact: true,
    },
    defaultPages: DEFAULT_PAGES,
    sortOrder: 7,
  },
  {
    slug: "ridge",
    name: "Ridge//",
    description:
      "High-contrast performance. Italic mono numerals, oversized CTAs, tactical orange accent. Inter 800 display. Best for sports, fitness, and outdoor.",
    category: "sports",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#0a0a0a",
        secondary: "#3a3a3a",
        accent: "#ff5722",
        background: "#f5f4f0",
        surface: "#e8e6e0",
        text: "#0a0a0a",
        muted: "#6b6863",
        border: "#d6d3cc",
        ring: "#ff5722",
      },
      typography: {
        heading: "Inter",
        body: "Inter",
        display: "Inter",
        scaleRatio: 1.333,
        baseFontSize: 15,
      },
      spacing: { base: 4, sectionPadding: "balanced" },
      radius: "sharp",
      theme: "light",
    },
    defaultSections: {
      hero: true,
      stats: true,
      categories: true,
      products: true,
      story: true,
      contact: true,
    },
    defaultPages: DEFAULT_PAGES,
    sortOrder: 8,
  },
  {
    slug: "verdant",
    name: "Verdant",
    description:
      "Forest-floor palette. Botanical Fraunces serif, soil-tone surfaces, care-guide PDP modules. Best for plants, garden, and natural goods.",
    category: "plants",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#6b8458",
        secondary: "#a89270",
        accent: "#a89270",
        background: "#2f3a2f",
        surface: "#3a4838",
        text: "#e3ddc8",
        muted: "#a8b29a",
        border: "#475744",
        ring: "#6b8458",
      },
      typography: {
        heading: "Fraunces",
        body: "Inter",
        display: "Fraunces",
        scaleRatio: 1.25,
        baseFontSize: 16,
      },
      spacing: { base: 4, sectionPadding: "balanced" },
      radius: "sharp",
      theme: "dark",
    },
    defaultSections: {
      hero: true,
      categories: true,
      story: true,
      products: true,
      testimonials: true,
      newsletter: true,
      contact: true,
    },
    defaultPages: DEFAULT_PAGES,
    sortOrder: 9,
  },
  {
    slug: "foxglove",
    name: "Foxglove & Co.",
    description:
      "Library-paper warmth, literary italic, indexed PLP, marginalia annotations on PDP. Hairline 1px radius. Best for books, stationery, and indie press.",
    category: "books",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#2a1f17",
        secondary: "#6b3a26",
        accent: "#2f4a3a",
        background: "#ece4d3",
        surface: "#ddd2bb",
        text: "#2a1f17",
        muted: "#6e5a48",
        border: "#c8b89c",
        ring: "#6b3a26",
      },
      typography: {
        heading: "Fraunces",
        body: "Inter",
        display: "Fraunces",
        scaleRatio: 1.25,
        baseFontSize: 17,
      },
      spacing: { base: 4, sectionPadding: "spacious" },
      radius: "sharp",
      theme: "light",
    },
    defaultSections: {
      hero: true,
      categories: true,
      story: true,
      products: true,
      testimonials: true,
      newsletter: true,
      contact: true,
    },
    defaultPages: DEFAULT_PAGES,
    sortOrder: 10,
  },
  // "Blank canvas" — kept as the 11th seed because SiteTemplatePicker
  // surfaces it as a separate "Start from scratch" affordance below the
  // niche-targeted templates. No blueprint module: picking it leaves the
  // tenant's SiteLayouts empty so they can author from zero.
  {
    slug: "blank",
    name: "Blank canvas",
    description:
      "Start from scratch. No pre-seeded sections, no theme presets — design every block by hand.",
    category: "general",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#1a1a1a",
        secondary: "#525252",
        accent: "#3b82f6",
        background: "#ffffff",
        surface: "#fafafa",
        text: "#1a1a1a",
        muted: "#737373",
        border: "#e5e5e5",
        ring: "#3b82f6",
      },
      typography: {
        heading: "Inter",
        body: "Inter",
        display: "Inter",
        scaleRatio: 1.2,
        baseFontSize: 16,
      },
      spacing: { base: 4, sectionPadding: "balanced" },
      radius: "rounded",
      theme: "light",
    },
    defaultSections: { hero: false, products: false },
    defaultPages: DEFAULT_PAGES,
    sortOrder: 99,
  },
];

/**
 * Repoint any SiteConfig referencing a deprecated template slug to the
 * closest new equivalent, then delete the deprecated SiteTemplate rows.
 * Idempotent — if a deprecated row is already gone, that mapping is a no-op.
 */
async function cleanupDeprecatedTemplates(
  prisma: PrismaClient,
  newSlugToId: Record<string, string>,
): Promise<void> {
  const deprecatedSlugs = Object.keys(DEPRECATED_REPOINTS);
  const deprecated = await prisma.siteTemplate.findMany({
    where: { slug: { in: deprecatedSlugs } },
    select: { id: true, slug: true },
  });
  if (deprecated.length === 0) return;

  let totalRepointed = 0;
  for (const row of deprecated) {
    const targetSlug = DEPRECATED_REPOINTS[row.slug];
    const targetId = targetSlug ? newSlugToId[targetSlug] : undefined;
    if (!targetId) {
      console.warn(
        `  ⚠ Deprecated template "${row.slug}" maps to "${targetSlug}", but the new row is missing — skipping repoint.`,
      );
      continue;
    }
    const result = await prisma.siteConfig.updateMany({
      where: { templateId: row.id },
      data: { templateId: targetId },
    });
    totalRepointed += result.count;
  }

  await prisma.siteTemplate.deleteMany({
    where: { id: { in: deprecated.map((d) => d.id) } },
  });

  console.log(
    `  ✓ Removed ${deprecated.length} deprecated templates (${deprecated
      .map((d) => d.slug)
      .join(", ")}); repointed ${totalRepointed} site config(s)`,
  );
}

export async function seedSiteTemplates(prisma: PrismaClient): Promise<void> {
  // Upsert the 10 new templates first so deprecated repoints have targets.
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
        isActive: true,
      },
    });
  }

  // Build the new-slug → id lookup once, then run the deprecated-slug cleanup.
  const newRows = await prisma.siteTemplate.findMany({
    where: { slug: { in: TEMPLATES.map((t) => t.slug) } },
    select: { id: true, slug: true },
  });
  const newSlugToId: Record<string, string> = {};
  for (const r of newRows) newSlugToId[r.slug] = r.id;

  await cleanupDeprecatedTemplates(prisma, newSlugToId);

  console.log(`  ✓ Site templates (${TEMPLATES.length})`);
}
