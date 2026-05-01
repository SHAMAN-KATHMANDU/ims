/**
 * Organic template — home layout
 */

import type { BlockNode } from "@repo/shared";
import { block } from "../_shared/factories";

export function organicHome(): BlockNode[] {
  // Warm, earthy. Hero → story first (before commerce) → products →
  // category tiles → newsletter.
  return [
    block("hero", {
      variant: "standard",
      title: "Rooted in nature, crafted by hand",
      subtitle: "Ethically sourced, thoughtfully made",
      ctaLabel: "Explore the collection",
      ctaHref: "/products",
    }),
    block("story-split", {
      eyebrow: "Rooted in craft",
      title: "Grown slowly, made carefully",
      body: "We work with a small circle of makers across the region. Each piece takes the time it takes.",
      imageSide: "right",
      ctaHref: "/about",
      ctaLabel: "Our process",
    }),
    block("product-grid", {
      eyebrow: "This season",
      heading: "New for spring",
      source: "featured",
      limit: 6,
      columns: 3,
      cardVariant: "bare",
    }),
    block("category-tiles", {
      heading: "Browse by collection",
      columns: 3,
      aspectRatio: "4/5",
    }),
    block("trust-strip", {
      items: [
        { label: "Natural", value: "Materials" },
        { label: "Small batch", value: "Always" },
        { label: "Ethical", value: "Supply chain" },
      ],
    }),
    block("testimonials", {
      heading: "What makers are saying",
      layout: "grid",
      items: [
        {
          quote:
            "Every piece I send to their studio comes back with more soul than I gave it. A rare partnership.",
          author: "Aanya Raut",
          role: "Weaver, Kolhapur",
        },
        {
          quote:
            "They pay on time, order in small batches, and tell the story honestly. That is everything.",
          author: "Deepak Lal",
          role: "Potter, Pondicherry",
        },
      ],
    }),
    block("newsletter", {
      title: "Grow with us",
      subtitle: "Seasonal notes, nothing else.",
      cta: "Join",
    }),
  ];
}
