/**
 * Verdant template — home layout
 *
 * Forest-floor palette. Botanical serif, soil-tone surfaces.
 * Niche: plants / garden.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function verdantHome(): BlockNode[] {
  resetIdCounter();
  return [
    block("hero", {
      variant: "editorial",
      heroLayout: "split-right",
      title: "A quieter house, in green.",
      subtitle:
        "Hand-grown plants, soil-true ceramics, and care guides written by people who actually grow them.",
      ctaLabel: "Browse the garden",
      ctaHref: "/products",
    }),
    block("collection-cards", {
      eyebrow: "By light",
      heading: "What's right for your room",
      cards: [
        {
          title: "Bright, direct",
          subtitle: "South-facing windows",
          ctaHref: "/products?tag=high-light",
        },
        {
          title: "Bright, indirect",
          subtitle: "Most living rooms",
          ctaHref: "/products?tag=medium-light",
        },
        {
          title: "Low light",
          subtitle: "Hallways & bathrooms",
          ctaHref: "/products?tag=low-light",
        },
      ],
      aspectRatio: "portrait",
    }),
    block("story-split", {
      eyebrow: "The garden",
      title: "A working nursery, north of Pune.",
      body: "Every plant we ship was grown — not just held — by us. We've been propagating in the same shade-house since 2014.",
      imageSide: "left",
      ctaLabel: "Visit the nursery",
      ctaHref: "/about",
    }),
    block("product-grid", {
      eyebrow: "In season",
      heading: "Healthy and ready",
      source: "featured",
      limit: 8,
      columns: 4,
      cardVariant: "bare",
      cardAspectRatio: "1/1",
    }),
    block("testimonials", {
      heading: "From living rooms",
      items: [
        {
          quote: "Three plants, three thriving. The care card actually helped.",
          author: "Anjali R.",
          role: "Pune",
        },
        {
          quote: "Best-packaged plant I've ever received.",
          author: "Daniel S.",
          role: "Goa",
        },
      ],
      layout: "grid",
      columns: 2,
    }),
    block("newsletter", {
      title: "Care notes",
      subtitle:
        "A monthly note on what to water, what to pot up, and what's about to flower.",
      cta: "Subscribe",
      variant: "card",
    }),
  ];
}
