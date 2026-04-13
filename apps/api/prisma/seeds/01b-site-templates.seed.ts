import type { PrismaClient, Prisma } from "@prisma/client";

/**
 * Platform-level catalog of website templates tenants can pick from.
 * Idempotent upsert keyed by slug.
 */

type TemplateSeed = {
  slug: string;
  name: string;
  description: string;
  tier: "MINIMAL" | "STANDARD" | "LUXURY" | "BOUTIQUE";
  previewImageUrl: string | null;
  defaultBranding: Prisma.InputJsonValue;
  defaultSections: Prisma.InputJsonValue;
  sortOrder: number;
};

const TEMPLATES: TemplateSeed[] = [
  {
    slug: "minimal",
    name: "Minimal",
    description:
      "Clean, fast, type-forward. Best for stores that let product photos do the talking.",
    tier: "MINIMAL",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#111111",
        accent: "#F5F5F5",
        background: "#FFFFFF",
        text: "#111111",
      },
      typography: { heading: "Inter", body: "Inter" },
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
    sortOrder: 10,
  },
  {
    slug: "standard",
    name: "Standard",
    description:
      "Balanced default template with everything a tenant needs out of the box.",
    tier: "STANDARD",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#1E40AF",
        accent: "#F59E0B",
        background: "#FFFFFF",
        text: "#0F172A",
      },
      typography: { heading: "Poppins", body: "Inter" },
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
    sortOrder: 20,
  },
  {
    slug: "luxury",
    name: "Luxury",
    description:
      "Dark, editorial layout with serif headings. Built for high-end brands and boutiques.",
    tier: "LUXURY",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#B8860B",
        accent: "#0A0A0A",
        background: "#0A0A0A",
        text: "#F5F5F5",
      },
      typography: { heading: "Playfair Display", body: "Inter" },
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
    sortOrder: 30,
  },
  {
    slug: "boutique",
    name: "Boutique",
    description:
      "Warm, story-driven template with large imagery and slow reveal sections.",
    tier: "BOUTIQUE",
    previewImageUrl: null,
    defaultBranding: {
      colors: {
        primary: "#8B4513",
        accent: "#FFF5E6",
        background: "#FFF5E6",
        text: "#3E2723",
      },
      typography: { heading: "Cormorant Garamond", body: "Lora" },
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
        tier: t.tier,
        previewImageUrl: t.previewImageUrl,
        defaultBranding: t.defaultBranding,
        defaultSections: t.defaultSections,
        isActive: true,
        sortOrder: t.sortOrder,
      },
      update: {
        name: t.name,
        description: t.description,
        tier: t.tier,
        previewImageUrl: t.previewImageUrl,
        defaultBranding: t.defaultBranding,
        defaultSections: t.defaultSections,
        sortOrder: t.sortOrder,
      },
    });
  }
  console.log(`  ✓ Site templates (${TEMPLATES.length})`);
}
