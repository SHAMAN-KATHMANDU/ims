/**
 * Seed a realistic demo home-page block tree for local development.
 *
 * Target: the tenant with slug "demo". Ensures the tenant has a SiteConfig
 * (websiteEnabled + isPublished), a default header NavMenu, and a
 * home-scope SiteLayout composed of the Phase 3 block library. Idempotent
 * — re-running updates the existing rows.
 *
 * Usage:
 *   cd apps/api && npx tsx prisma/scripts/seed-demo-home-layout.ts
 */

import { PrismaClient, type Prisma } from "@prisma/client";
import {
  defaultHeaderNavConfig,
  type BlockNode,
  type BlockPropsMap,
} from "@repo/shared";

const DEMO_TENANT_SLUG = "demo";

// Tiny helper to keep block objects concise while staying type-safe.
function block<K extends keyof BlockPropsMap>(
  id: string,
  kind: K,
  props: BlockPropsMap[K],
  children?: BlockNode[],
): BlockNode<K> {
  return { id, kind, props, children };
}

function buildHomeBlocks(): BlockNode[] {
  return [
    block("hero-1", "hero", {
      variant: "editorial",
      ctaLabel: "Shop the collection",
      ctaHref: "/products",
    }),
    block("trust-1", "trust-strip", {
      items: [
        { label: "Handmade", value: "By artisans" },
        { label: "Shipping", value: "Free over ₹5,000" },
        { label: "Returns", value: "30 days, no hassle" },
        { label: "Support", value: "Mon–Sat 10–6" },
      ],
    }),
    block("cats-1", "category-tiles", {
      heading: "Shop by category",
      columns: 3,
      aspectRatio: "4/5",
    }),
    block("grid-1", "product-grid", {
      eyebrow: "New arrivals",
      heading: "Just in",
      source: "featured",
      limit: 8,
      columns: 4,
      cardVariant: "bordered",
    }),
    block("story-1", "story-split", {
      eyebrow: "Our story",
      title: "Crafted with intention",
      body: "Every piece in our collection is the result of countless hours of careful work by artisans we've known for years. No two are quite alike, and that's the point.",
      imageSide: "left",
      ctaHref: "/about",
      ctaLabel: "Read more",
    }),
    block("bento-1", "bento-showcase", {
      eyebrow: "Featured",
      heading: "Worth a closer look",
      source: "featured",
      limit: 5,
    }),
    block("stats-1", "stats-band", {
      items: [
        { value: "12 yrs", label: "Crafting" },
        { value: "42", label: "Artisans" },
        { value: "6k+", label: "Happy customers" },
      ],
    }),
    block("testi-1", "testimonials", {
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
            "I've bought three pieces now and each one is better than the last. Can't recommend enough.",
          author: "Marcus T.",
          role: "London",
        },
        {
          quote:
            "Found this shop by accident and now I tell everyone about it. The craftsmanship speaks for itself.",
          author: "Priya S.",
          role: "Bangalore",
        },
      ],
    }),
    block("faq-1", "faq", {
      heading: "Questions, answered",
      items: [
        {
          question: "Do you ship internationally?",
          answer:
            "Yes — we ship to 40+ countries. International rates are calculated at checkout.",
        },
        {
          question: "What's your return policy?",
          answer:
            "30 days, no questions asked. Items must be in original condition.",
        },
        {
          question: "How long do orders take?",
          answer:
            "Most orders ship within 2 business days. Delivery is typically 3–5 days within India, 7–14 internationally.",
        },
      ],
    }),
    block("news-1", "newsletter", {
      title: "Stay in the loop",
      subtitle:
        "Occasional updates about new pieces and stories from the workshop.",
      cta: "Subscribe",
    }),
  ];
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: DEMO_TENANT_SLUG },
    });
    if (!tenant) {
      console.error(
        `[seed-demo-home-layout] no tenant with slug="${DEMO_TENANT_SLUG}" — run the base seed first.`,
      );
      process.exit(1);
    }

    // 1. Ensure SiteConfig exists and is website-enabled + published.
    const existingSite = await prisma.siteConfig.findUnique({
      where: { tenantId: tenant.id },
    });
    if (!existingSite) {
      await prisma.siteConfig.create({
        data: {
          tenantId: tenant.id,
          websiteEnabled: true,
          isPublished: true,
          branding: {
            name: "Atelier Demo",
            tagline: "Considered goods, handmade.",
            colors: {
              primary: "#1a1a1a",
              background: "#fafafa",
              text: "#111111",
              accent: "#e8e6e1",
            },
          } as Prisma.InputJsonValue,
          contact: {
            email: "hello@atelier-demo.test",
            phone: "+91 98765 43210",
            address: "42 Studio Lane, Bangalore",
          } as Prisma.InputJsonValue,
        },
      });
      console.log("[seed-demo-home-layout] created SiteConfig");
    } else if (!existingSite.websiteEnabled || !existingSite.isPublished) {
      await prisma.siteConfig.update({
        where: { tenantId: tenant.id },
        data: { websiteEnabled: true, isPublished: true },
      });
      console.log("[seed-demo-home-layout] enabled + published SiteConfig");
    }

    // 2. Ensure header-primary NavMenu exists.
    const existingNav = await prisma.navMenu.findFirst({
      where: { tenantId: tenant.id, slot: "header-primary" },
      select: { id: true },
    });
    if (!existingNav) {
      await prisma.navMenu.create({
        data: {
          tenantId: tenant.id,
          slot: "header-primary",
          items: defaultHeaderNavConfig() as unknown as Prisma.InputJsonValue,
        },
      });
      console.log("[seed-demo-home-layout] created header NavMenu");
    }

    // 3. Seed the home SiteLayout (upsert into `blocks`, NOT draftBlocks,
    // so the public preview shows it immediately).
    const blocks = buildHomeBlocks();
    const existingLayout = await prisma.siteLayout.findFirst({
      where: { tenantId: tenant.id, scope: "home", pageId: null },
      select: { id: true },
    });
    if (existingLayout) {
      await prisma.siteLayout.update({
        where: { id: existingLayout.id },
        data: {
          blocks: blocks as unknown as Prisma.InputJsonValue,
          draftBlocks: null,
          version: { increment: 1 },
        },
      });
      console.log(
        `[seed-demo-home-layout] updated home SiteLayout (${blocks.length} blocks)`,
      );
    } else {
      await prisma.siteLayout.create({
        data: {
          tenantId: tenant.id,
          scope: "home",
          pageId: null,
          blocks: blocks as unknown as Prisma.InputJsonValue,
        },
      });
      console.log(
        `[seed-demo-home-layout] created home SiteLayout (${blocks.length} blocks)`,
      );
    }

    console.log(
      `[seed-demo-home-layout] done — tenant=${tenant.slug} (${tenant.id})`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
