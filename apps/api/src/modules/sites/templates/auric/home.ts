/**
 * Auric template — home layout
 *
 * Cream-on-cream luxury. Hairline rules, italic display, gold accent.
 * Niche: jewelry / accessories.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function auricHome(): BlockNode[] {
  resetIdCounter();
  return [
    block("hero", {
      variant: "luxury",
      heroLayout: "centered",
      title: "Heirlooms, in waiting.",
      subtitle:
        "Hand-finished gold pieces. Made to be worn now, kept for later.",
      ctaLabel: "View the collection",
      ctaHref: "/products",
    }),
    block("collection-cards", {
      eyebrow: "By piece",
      heading: "The collection",
      cards: [
        {
          title: "Rings",
          subtitle: "Engagement & everyday",
          ctaHref: "/products?category=rings",
        },
        {
          title: "Necklaces",
          subtitle: "Pendants & chains",
          ctaHref: "/products?category=necklaces",
        },
      ],
      aspectRatio: "landscape",
    }),
    block("story-split", {
      eyebrow: "Heritage",
      title: "A workshop in Jaipur. A practice from Florence.",
      body: "Every Auric piece is bench-finished by a goldsmith we know by name. We use only recycled gold, lab-grown diamonds, and ethically-sourced colored stones.",
      imageSide: "left",
      ctaLabel: "Visit the atelier",
      ctaHref: "/about",
    }),
    block("product-grid", {
      eyebrow: "New arrivals",
      heading: "Just added",
      source: "newest",
      limit: 6,
      columns: 3,
      cardVariant: "bare",
      cardAspectRatio: "1/1",
    }),
    block("testimonials", {
      heading: "Notes from the wearer",
      items: [
        {
          quote: "I have not taken it off in eight months.",
          author: "Sara L.",
          role: "Bangalore",
        },
        {
          quote: "It feels like an heirloom we only just discovered.",
          author: "Michael F.",
          role: "Bombay",
        },
      ],
      layout: "grid",
      columns: 2,
    }),
  ];
}
