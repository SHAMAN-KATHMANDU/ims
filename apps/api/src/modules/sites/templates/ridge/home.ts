/**
 * Ridge// template — home layout
 *
 * High-contrast performance. Italic mono numerals, oversized CTAs, tactical
 * orange. Niche: sports / fitness.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function ridgeHome(): BlockNode[] {
  resetIdCounter();
  return [
    block("announcement-bar", {
      text: "Train hard. Free returns within 30 days.",
      marquee: true,
      tone: "default",
      items: [
        "Train hard. Returns 30 days.",
        "Free shipping over ₹3,500",
        "Drop 12 — live now",
      ],
    }),
    block("nav-bar", {
      brand: "RIDGE//",
      brandStyle: "sans",
      items: [
        { label: "Run", href: "/products?category=run" },
        { label: "Train", href: "/products?category=train" },
        { label: "Outdoor", href: "/products?category=outdoor" },
        { label: "Drops", href: "/offers" },
      ],
      showSearch: true,
      showCart: true,
      showAccount: true,
      sticky: true,
      align: "between",
    }),
    block("hero", {
      variant: "minimal",
      heroLayout: "split-left",
      title: "Built for the next 10K.",
      subtitle:
        "Performance gear engineered for athletes who measure their PRs in seconds, not weeks.",
      ctaLabel: "Shop Drop 12",
      ctaHref: "/products",
    }),
    block("stats-band", {
      items: [
        { value: "32", label: "Drops shipped" },
        { value: "1,847", label: "PRs logged" },
        { value: "12 yrs", label: "Field tested" },
      ],
      dark: true,
      alignment: "start",
      valueSize: "xl",
    }),
    block("collection-cards", {
      heading: "Disciplines",
      cards: [
        {
          title: "Run",
          subtitle: "Trainers + apparel",
          ctaHref: "/products?category=run",
        },
        {
          title: "Train",
          subtitle: "Strength + recovery",
          ctaHref: "/products?category=train",
        },
        {
          title: "Outdoor",
          subtitle: "Hike + trail",
          ctaHref: "/products?category=outdoor",
        },
      ],
      aspectRatio: "square",
    }),
    block("product-grid", {
      eyebrow: "Drop 12",
      heading: "Tested. Iterated. Shipping.",
      source: "newest",
      limit: 8,
      columns: 4,
      cardVariant: "bordered",
      cardAspectRatio: "3/4",
    }),
    block("story-split", {
      eyebrow: "Field log",
      title: "Athlete-led, athlete-tested.",
      body: "Every Ridge product spends six weeks with a panel of athletes before it ever ships. The ones that don't earn it never leave the lab.",
      imageSide: "right",
      ctaLabel: "Read the field log",
      ctaHref: "/blog",
    }),
    block("footer-columns", {
      showBrand: true,
      brand: "RIDGE//",
      tagline: "Performance gear for the next attempt.",
      columns: [
        {
          title: "Shop",
          links: [
            { label: "Run", href: "/products?category=run" },
            { label: "Train", href: "/products?category=train" },
            { label: "Outdoor", href: "/products?category=outdoor" },
            { label: "Drops", href: "/offers" },
          ],
        },
        {
          title: "Field",
          links: [
            { label: "Field log", href: "/blog" },
            { label: "Athletes", href: "/about" },
            { label: "Sustainability", href: "/about" },
          ],
        },
        {
          title: "Service",
          links: [
            { label: "Returns", href: "/about" },
            { label: "Sizing", href: "/about" },
            { label: "Contact", href: "/contact" },
          ],
        },
      ],
    }),
  ];
}
