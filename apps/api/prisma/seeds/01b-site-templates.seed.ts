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

const TEMPLATES: TemplateSeed[] = [
  {
    slug: "minimal",
    name: "Minimal",
    description:
      "Clean, fast, type-forward. Best for stores that let product photos do the talking.",
    category: "minimal",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#111111",
        secondary: "#444444",
        accent: "#F5F5F5",
        background: "#FFFFFF",
        surface: "#FAFAFA",
        text: "#111111",
        muted: "#6B7280",
        border: "#E5E5E5",
        ring: "#111111",
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
      showrooms: true,
      articles: false,
      contact: true,
      newsletter: false,
    },
    defaultPages: DEFAULT_PAGES,
    sortOrder: 10,
  },
  {
    slug: "standard",
    name: "Standard",
    description:
      "Balanced default template with everything a tenant needs out of the box.",
    category: "standard",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#1E40AF",
        secondary: "#3B82F6",
        accent: "#F59E0B",
        background: "#FFFFFF",
        surface: "#F8FAFC",
        text: "#0F172A",
        muted: "#64748B",
        border: "#E2E8F0",
        ring: "#1E40AF",
      },
      typography: {
        heading: "Poppins",
        body: "Inter",
        display: "Poppins",
        scaleRatio: 1.25,
        baseFontSize: 16,
      },
      spacing: { base: 4, sectionPadding: "balanced" },
      radius: "soft",
      theme: "light",
    },
    defaultSections: {
      hero: true,
      products: true,
      categories: true,
      showrooms: true,
      articles: true,
      contact: true,
      newsletter: true,
    },
    defaultPages: DEFAULT_PAGES,
    sortOrder: 20,
  },
  {
    slug: "luxury",
    name: "Luxury",
    description:
      "Dark, editorial layout with serif headings. Built for high-end brands and boutiques.",
    category: "luxury",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#B8860B",
        secondary: "#8B6914",
        accent: "#0A0A0A",
        background: "#0A0A0A",
        surface: "#141414",
        text: "#F5F5F5",
        muted: "#9CA3AF",
        border: "#2A2A2A",
        ring: "#B8860B",
      },
      typography: {
        heading: "Playfair Display",
        body: "Inter",
        display: "Playfair Display",
        scaleRatio: 1.333,
        baseFontSize: 17,
      },
      spacing: { base: 5, sectionPadding: "spacious" },
      radius: "sharp",
      theme: "dark",
    },
    defaultSections: {
      hero: true,
      products: true,
      categories: true,
      showrooms: true,
      articles: true,
      contact: true,
      newsletter: true,
      lookbook: true,
    },
    defaultPages: DEFAULT_PAGES,
    sortOrder: 30,
  },
  {
    slug: "boutique",
    name: "Boutique",
    description:
      "Warm, story-driven template with large imagery and slow reveal sections.",
    category: "boutique",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#8B4513",
        secondary: "#A0522D",
        accent: "#FFF5E6",
        background: "#FFF5E6",
        surface: "#FBF2E1",
        text: "#3E2723",
        muted: "#6B5B4D",
        border: "#E8D9C2",
        ring: "#8B4513",
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
      products: true,
      categories: false,
      showrooms: true,
      articles: true,
      contact: true,
      newsletter: true,
      story: true,
    },
    defaultPages: DEFAULT_PAGES,
    sortOrder: 40,
  },
];

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
  console.log(`  ✓ Site templates (${TEMPLATES.length})`);
}
