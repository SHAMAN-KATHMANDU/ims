/**
 * Maison template — home layout
 *
 * Editorial warmth. Oak-and-clay palette, generous serif display, full-bleed
 * hero, three "rooms" collection cards, atelier promo, press testimonials.
 * Niche: interior design / furniture.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function maisonHome(): BlockNode[] {
  resetIdCounter();
  return [
    block("hero", {
      variant: "editorial",
      heroLayout: "split-right",
      title: "Built for quiet rooms.",
      subtitle:
        "Solid oak, hand-rubbed clay, and a few honest details. Pieces designed to outlast trends — and the room you put them in.",
      ctaLabel: "Shop the catalogue",
      ctaHref: "/products",
    }),
    block("collection-cards", {
      eyebrow: "Six rooms, one quiet hand",
      heading: "Shop by room",
      cards: [
        {
          title: "The living room",
          subtitle: "Sofas, lounges, low tables",
          ctaHref: "/products?category=living",
        },
        {
          title: "Around the table",
          subtitle: "Dining + serveware",
          ctaHref: "/products?category=dining",
        },
        {
          title: "For sleeping rooms",
          subtitle: "Beds, nightstands, linens",
          ctaHref: "/products?category=bedroom",
        },
      ],
      aspectRatio: "portrait",
    }),
    block("story-split", {
      eyebrow: "The Atelier",
      title: "Made-to-order, in fourteen woods.",
      body: "Every piece in the Atelier line is built to your specification, by a maker we know by name. Six-week lead time. Lifetime frame warranty.",
      imageSide: "right",
      ctaLabel: "Begin a commission",
      ctaHref: "/contact",
    }),
    block("product-grid", {
      eyebrow: "New arrivals",
      heading: "Just in",
      source: "newest",
      limit: 8,
      columns: 4,
      cardVariant: "bare",
      cardAspectRatio: "1/1",
    }),
    block("testimonials", {
      heading: "Said about us",
      items: [
        {
          quote: "The kind of furniture that lets a room finally breathe.",
          author: "Domus Magazine",
        },
        {
          quote: "A reference catalogue for the new American home.",
          author: "Dwell",
        },
        { quote: "Restraint, in oak.", author: "The Wirecutter" },
      ],
      layout: "grid",
      columns: 3,
    }),
    block("newsletter", {
      title: "The Quiet Letter",
      subtitle: "A note from the workshop, every other Sunday.",
      cta: "Subscribe",
      variant: "inline",
    }),
  ];
}
