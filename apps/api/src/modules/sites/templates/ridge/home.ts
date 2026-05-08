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
  ];
}
