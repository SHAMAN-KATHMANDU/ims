/**
 * Demo blog seed.
 *
 * Creates 3 categories and 6 posts (mix of DRAFT + PUBLISHED) for the demo
 * tenant so dev + stage environments have something to render at /blog.
 *
 * Idempotent: uses upsert on (tenantId, slug). Re-running the seed updates
 * existing categories/posts in place rather than duplicating.
 *
 * Also ensures the demo tenant has a SiteConfig with websiteEnabled=true and
 * isPublished=true — the blog gate reads that config, so without it the
 * seed posts would 404 on the tenant-site.
 */

import type { PrismaClient } from "@prisma/client";
import type { SeedContext } from "./types";

type CategorySeed = { slug: string; name: string; description: string };
type PostSeed = {
  slug: string;
  title: string;
  excerpt: string;
  bodyMarkdown: string;
  authorName: string;
  categorySlug: string | null;
  tags: string[];
  status: "DRAFT" | "PUBLISHED";
  heroImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

const CATEGORIES: CategorySeed[] = [
  {
    slug: "stories",
    name: "Stories",
    description: "Brand narratives, customer features, and behind-the-scenes.",
  },
  {
    slug: "craft",
    name: "Craft",
    description: "Materials, technique, and how things get made.",
  },
  {
    slug: "updates",
    name: "Updates",
    description: "Product launches, collaborations, and announcements.",
  },
];

const POSTS: PostSeed[] = [
  {
    slug: "welcome-to-our-journal",
    title: "Welcome to our journal",
    excerpt:
      "A new space to share the stories behind every product, every partnership, and every passing season.",
    bodyMarkdown: `# A place for stories

We started this journal because a product listing never tells the whole story. Every piece in our shop comes from somewhere — a workshop, a material, a moment — and we want you to see all of it.

## What you'll find here

Expect three kinds of posts:

- **Stories**: features on the people we work with and the customers we serve.
- **Craft**: deep dives on materials, technique, and process.
- **Updates**: what's launching, what's retiring, and what's next.

## A note on pace

We're not trying to fill a feed. We publish when we have something worth saying. Bookmark the page, or pop your email into the footer — we'll send the occasional heads-up, never more than once a month.

Thanks for being here. Let's begin.`,
    authorName: "The Team",
    categorySlug: "stories",
    tags: ["welcome", "introduction"],
    status: "PUBLISHED",
    heroImageUrl: null,
    seoTitle: "Welcome to our journal",
    seoDescription:
      "A new space to share the stories behind every product and partnership.",
  },
  {
    slug: "how-we-source-our-linen",
    title: "How we source our linen",
    excerpt:
      "From flax field to finished fabric — the four-month journey behind every one of our linen pieces.",
    bodyMarkdown: `# From field to thread

Linen is one of the oldest textiles in the world, and also one of the slowest to make. Here's what goes into every meter that ends up on our shelves.

## Step 1 — the flax field

Flax grows in about 100 days. Unlike cotton, it doesn't need irrigation in the climates we source from, and it doesn't need pesticides either. The plant is pulled up by the root — not cut — so the fibers stay as long as possible.

## Step 2 — retting

After harvest, the flax is left in fields to **ret** (break down the pectin that binds the fibers to the stalk). Most of our suppliers do dew retting: spread out the stalks, let the morning dew do the work, turn once. It takes three to five weeks.

## Step 3 — scutching and hackling

This is where the woody core gets separated from the long fibers. The long fibers ("line") become our fabric; the shorter ones ("tow") are used elsewhere.

## Step 4 — spinning and weaving

A final spin and weave, and we're looking at the bolts of cloth that eventually become a shirt, a napkin, a throw. Four months, in total, from seed to shop.

We think that matters.`,
    authorName: "Priya Shrestha",
    categorySlug: "craft",
    tags: ["linen", "sourcing", "materials"],
    status: "PUBLISHED",
    heroImageUrl: null,
    seoTitle: "How we source our linen — field to finished fabric",
    seoDescription:
      "The four-month, chemical-free process behind every linen piece in our shop.",
  },
  {
    slug: "spring-2026-collection-notes",
    title: "Spring 2026 — collection notes",
    excerpt:
      "Lighter palettes, wider cuts, and three pieces we almost didn't make.",
    bodyMarkdown: `# Spring 2026

Spring is a small collection this year — fifteen pieces instead of the usual twenty-five. We kept the ones we were sure about and cut the rest.

## The palette

We pulled from early-morning photographs: soft greys, a warm almond, one very saturated blue we couldn't get out of our heads.

## The cuts

Everything is a little wider than last year. The word we kept coming back to was **ease**.

## The three we almost didn't make

1. A lightweight linen blazer — we weren't sure if the market wanted another blazer. We made 80.
2. A reversible tote in cotton canvas — the prototype took five rounds to get right.
3. A fisherman sweater in recycled wool — the most expensive piece we've ever produced. We made 30.

All three are in shops now. Let us know what you think.`,
    authorName: "Ayla Tamang",
    categorySlug: "updates",
    tags: ["launch", "spring-2026", "collection"],
    status: "PUBLISHED",
    heroImageUrl: null,
    seoTitle: "Spring 2026 collection notes",
    seoDescription:
      "Fifteen pieces, a softer palette, and three designs we almost didn't make.",
  },
  {
    slug: "a-week-with-the-team",
    title: "A week with the team",
    excerpt:
      "Five photos, five days, and a look at what the studio actually looks like when the doors are closed.",
    bodyMarkdown: `# What the studio looks like

We don't share behind-the-scenes often, partly because the studio is usually a mess and partly because we never remember to bring a camera. Last week we did both — remember, and clean.

## Monday

Design review. Six pieces on the table, four survived.

## Tuesday

Sample day. A photograph of twenty samples pinned to a wall never looks like work but we promise it is.

## Wednesday

Fabric delivery. The mill shipped a roll three weeks late and we spent the afternoon re-planning the cut.

## Thursday

Photo shoot for the newsletter. We were the models. You'll see why in the next post.

## Friday

Cleanup, and a long walk.

More of this soon, maybe.`,
    authorName: "The Team",
    categorySlug: "stories",
    tags: ["studio", "behind-the-scenes"],
    status: "PUBLISHED",
    heroImageUrl: null,
    seoTitle: "A week with the team",
    seoDescription: "Five photos, five days, behind the scenes in the studio.",
  },
  {
    slug: "why-we-moved-to-natural-dyes",
    title: "Why we moved to natural dyes",
    excerpt:
      "A draft of a longer essay on why we switched our whole dye process this year — and what it cost us.",
    bodyMarkdown: `# Draft — natural dyes

(This is a draft. We're publishing it in this form because the team keeps asking and we haven't gotten to polishing it.)

We switched our dye process this year. Here's the short version:

- Synthetic dyes are cheaper, more reliable, and the colors don't shift over time.
- Natural dyes (indigo, madder, walnut hulls) are slower, more expensive, and the colors do shift over time.
- We decided the shift was a feature, not a bug.

## The cost

About 14% more per piece, across the board. We absorbed it.

## What you'll notice

The blues will fade a little. The reds will deepen. The browns will stay the same but mellow. None of this happens in the first year.

More soon, once we finish the essay.`,
    authorName: "Priya Shrestha",
    categorySlug: "craft",
    tags: ["dyes", "process", "draft"],
    status: "DRAFT",
    heroImageUrl: null,
    seoTitle: null,
    seoDescription: null,
  },
  {
    slug: "a-note-for-our-wholesale-partners",
    title: "A note for our wholesale partners",
    excerpt:
      "Order windows, lead times, and a new consignment option for 2026.",
    bodyMarkdown: `# For our wholesale partners

A quick update on the wholesale side of things for the year ahead.

## Order windows

We've moved to two wholesale windows per year: January and July. Orders placed outside those windows go into the next one.

## Lead times

- Stocked items: 2 weeks from order.
- Made-to-order: 6 weeks.
- Custom colorways: 10 weeks, minimum order of 50 units.

## Consignment

New this year: a consignment option for partners who've worked with us for more than 12 months. Ask your account lead for terms.

Thanks, as always, for the partnership.`,
    authorName: "Wholesale Team",
    categorySlug: "updates",
    tags: ["wholesale", "partners", "ordering"],
    status: "DRAFT",
    heroImageUrl: null,
    seoTitle: null,
    seoDescription: null,
  },
];

function computeReadingMinutes(markdown: string): number {
  const stripped = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ");
  const words = stripped.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export async function seedDemoBlog(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  // Only seed blog content for the demo tenant — test1/test2/ruby don't need it.
  if (ctx.slug !== "demo") return ctx;

  console.log("  📝 Seeding demo blog content...");

  // 1. Ensure SiteConfig exists with website enabled + published so /blog
  //    routes actually render. In production this is done via platform admin.
  await prisma.siteConfig.upsert({
    where: { tenantId: ctx.tenantId },
    create: {
      tenantId: ctx.tenantId,
      websiteEnabled: true,
      isPublished: true,
      branding: {
        name: "Shaman Demo Store",
        tagline: "Crafted with intention since 1998",
        colors: {
          primary: "#2d3e2f",
          accent: "#c9a75a",
        },
      },
      contact: {
        email: "hello@demo.example",
        phone: "+977-1-4000000",
      },
      features: {
        hero: true,
        products: true,
        blog: true,
        contact: true,
      },
      seo: {
        title: "Shaman Demo Store",
        description:
          "A demo tenant for the Shaman platform, showcasing the tenant-site renderer.",
      },
    },
    update: {
      websiteEnabled: true,
      isPublished: true,
    },
  });

  // 2. Upsert categories keyed on (tenantId, slug).
  const categoryIdBySlug: Record<string, string> = {};
  for (const cat of CATEGORIES) {
    const row = await prisma.blogCategory.upsert({
      where: {
        tenantId_slug: { tenantId: ctx.tenantId, slug: cat.slug },
      },
      create: {
        tenantId: ctx.tenantId,
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        sortOrder: CATEGORIES.indexOf(cat) * 10,
      },
      update: {
        name: cat.name,
        description: cat.description,
      },
    });
    categoryIdBySlug[cat.slug] = row.id;
  }

  // 3. Upsert posts.
  for (const post of POSTS) {
    const categoryId = post.categorySlug
      ? (categoryIdBySlug[post.categorySlug] ?? null)
      : null;
    const readingMinutes = computeReadingMinutes(post.bodyMarkdown);
    const publishedAt = post.status === "PUBLISHED" ? new Date() : null;

    await prisma.blogPost.upsert({
      where: {
        tenantId_slug: { tenantId: ctx.tenantId, slug: post.slug },
      },
      create: {
        tenantId: ctx.tenantId,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        bodyMarkdown: post.bodyMarkdown,
        heroImageUrl: post.heroImageUrl,
        authorName: post.authorName,
        status: post.status,
        publishedAt,
        categoryId,
        tags: post.tags,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        readingMinutes,
      },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        bodyMarkdown: post.bodyMarkdown,
        heroImageUrl: post.heroImageUrl,
        authorName: post.authorName,
        status: post.status,
        categoryId,
        tags: post.tags,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        readingMinutes,
      },
    });
  }

  console.log(
    `    ✓ ${CATEGORIES.length} categories, ${POSTS.length} posts (${POSTS.filter((p) => p.status === "PUBLISHED").length} published)`,
  );
  return ctx;
}
