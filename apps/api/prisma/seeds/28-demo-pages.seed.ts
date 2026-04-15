/**
 * Demo tenant custom-page seed.
 *
 * Creates 3 TenantPage rows for the demo tenant — About, FAQ, Shipping &
 * returns — so the catch-all route at /<slug> has something to render out
 * of the box on dev + stage. Idempotent via upsert on (tenantId, slug).
 *
 * Only applies to the `demo` tenant. Other tenants stay empty until their
 * admin creates pages through the editor.
 *
 * The demo tenant's SiteConfig is created by 27-demo-blog.seed.ts which
 * runs first — this file just piggybacks on it, so no enable/publish
 * juggling is needed here.
 */

import type { PrismaClient } from "@prisma/client";
import type { SeedContext } from "./types";

type PageSeed = {
  slug: string;
  title: string;
  bodyMarkdown: string;
  layoutVariant: "default" | "full-width" | "narrow";
  showInNav: boolean;
  navOrder: number;
  seoTitle: string;
  seoDescription: string;
};

const PAGES: PageSeed[] = [
  {
    slug: "about",
    title: "About us",
    layoutVariant: "default",
    showInNav: true,
    navOrder: 0,
    seoTitle: "About us — Shaman Demo Store",
    seoDescription:
      "The story behind the demo store, our makers, and what we believe in.",
    bodyMarkdown: `## A quarter century at the bench

We opened the first workshop in 1998 with three tools and a lot of
stubbornness. Today there are three workshops and the same stubbornness.

Every piece we sell is made, finished, or at least looked at by someone
who has spent decades doing exactly that thing. We think you can tell.

## What we believe

- **Slow is a feature, not a bug.** The fast way is almost never the
  right way for the kind of work we do.
- **Materials first.** Our cost structure is upside-down compared to most
  shops — we spend more on raw materials than on marketing.
- **Fewer, better things.** Small collections invite more attention than
  large ones, and more attention means a better object.

## The people

Fifteen full-time makers split across three workshops in Kathmandu,
Bhaktapur, and Patan. Everyone who touches a piece signs it.

If you're ever in town, the main workshop is open by appointment —
[email us](mailto:hello@demo.shamankathmandu.com) and we'll make time.
`,
  },
  {
    slug: "faq",
    title: "FAQ",
    layoutVariant: "narrow",
    showInNav: true,
    navOrder: 1,
    seoTitle: "Frequently asked questions",
    seoDescription:
      "Answers to the questions we get most often about shipping, returns, customization, and care.",
    bodyMarkdown: `## Ordering

### Do you ship internationally?

Yes, to most countries. We use tracked priority mail, and shipping is
calculated at checkout based on weight and destination. Large pieces
ship in custom crates — allow an extra 2–3 business days for those.

### How long does delivery take?

- **Within Nepal:** 2–5 business days
- **Asia / Middle East:** 5–10 business days
- **Europe / Americas / Oceania:** 10–21 business days

Customs clearance in some countries can add another week — we can't
control that, but we do track every shipment and will let you know if
yours hits a snag.

### Can I customize a piece?

For certain categories, yes. Look for the "Made to order" tag on the
product page. Custom work adds 4–6 weeks to the lead time and is
non-returnable. Email us if you have a specific idea and we'll tell
you whether it's feasible.

## Care and returns

### How do I care for my piece?

Every piece ships with a small care card. General rules: keep it dry,
keep it out of direct sun for long periods, and clean it with a soft
cloth. We don't recommend any chemical cleaners — most of our materials
react badly to them.

### What's your return policy?

30 days, no questions asked, on anything that isn't made-to-order or
customized. The piece needs to come back in its original packaging and
in original condition. Shipping costs for returns are on the customer
unless the item arrived damaged.

### My piece arrived damaged. What now?

Email [hello@demo.shamankathmandu.com](mailto:hello@demo.shamankathmandu.com)
with a photo of the damage and your order number. We'll either replace
the piece or refund you in full — whichever you prefer. Damage in
transit isn't your problem.

## Wholesale

### Do you do wholesale?

Yes, for partners who've been customers for at least six months and
carry a minimum order of 15 pieces. Email the wholesale team at
[wholesale@demo.shamankathmandu.com](mailto:wholesale@demo.shamankathmandu.com).
`,
  },
  {
    slug: "shipping",
    title: "Shipping & returns",
    layoutVariant: "default",
    showInNav: true,
    navOrder: 2,
    seoTitle: "Shipping and returns policy",
    seoDescription:
      "How we ship, how long it takes, and what happens when you need to send something back.",
    bodyMarkdown: `## Shipping

We ship worldwide. Every order is packed by hand in the Kathmandu
workshop, usually within 2 business days of the order landing.

### Destinations and timelines

| Region | Lead time | Carrier |
|---|---|---|
| Within Nepal | 2–5 business days | Nepal Express |
| Asia / Middle East | 5–10 business days | DHL |
| Europe / Americas / Oceania | 10–21 business days | DHL / FedEx |

Rates are calculated at checkout based on weight and destination.
Large pieces (furniture, textiles over 1m, sculpture) ship in custom
crates — allow an extra 2–3 business days for those.

### Tracking

Every order ships with a tracking number. You'll get it by email when
the package leaves the workshop, and again when it clears customs in
your country.

### Customs and duties

For international orders, your country's customs and VAT are not
included in the listed price. We declare the full value on the customs
form — we can't legally declare less.

## Returns

30 days, no questions asked, on anything that isn't made-to-order or
customized.

### How to return something

1. Email us at [hello@demo.shamankathmandu.com](mailto:hello@demo.shamankathmandu.com)
   with your order number.
2. We'll send you a return shipping label (paid by you) and an RMA
   number.
3. Pack the piece back in its original packaging and mail it with the
   RMA inside.
4. Once it arrives at the workshop, we'll refund the full piece price
   within 5 business days.

### Exchanges

We don't do direct exchanges — return the original piece and place a
new order for the one you want. It's cleaner for everyone.

### Damaged in transit

Not your problem. Send a photo of the damage to
[hello@demo.shamankathmandu.com](mailto:hello@demo.shamankathmandu.com)
and we'll either replace the piece or refund you in full. You keep the
damaged one either way.
`,
  },
];

export async function seedDemoPages(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  // Only seed custom pages for the demo tenant.
  if (ctx.slug !== "demo") return ctx;

  console.log("  📄 Seeding demo custom pages...");

  for (const p of PAGES) {
    await prisma.tenantPage.upsert({
      where: {
        tenantId_slug: { tenantId: ctx.tenantId, slug: p.slug },
      },
      create: {
        tenantId: ctx.tenantId,
        slug: p.slug,
        title: p.title,
        bodyMarkdown: p.bodyMarkdown,
        layoutVariant: p.layoutVariant,
        showInNav: p.showInNav,
        navOrder: p.navOrder,
        isPublished: true,
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
      },
      update: {
        title: p.title,
        bodyMarkdown: p.bodyMarkdown,
        layoutVariant: p.layoutVariant,
        showInNav: p.showInNav,
        navOrder: p.navOrder,
        isPublished: true,
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
      },
    });
  }

  console.log(`    ✓ ${PAGES.length} custom pages (about, faq, shipping)`);
  return ctx;
}
