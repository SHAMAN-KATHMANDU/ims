/**
 * Fold template — home layout
 *
 * Swiss grid, ruthless typography. White, black, single oxblood accent.
 * Niche: fashion / apparel.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function foldHome(): BlockNode[] {
  resetIdCounter();
  return [
    block("hero", {
      variant: "minimal",
      heroLayout: "split-left",
      title: "Less, but louder.",
      subtitle: "AW26. Pieces built around a single oxblood accent.",
      ctaLabel: "Shop AW26",
      ctaHref: "/products",
    }),
    block("collection-cards", {
      heading: "Departments",
      cards: [
        {
          title: "Outerwear",
          subtitle: "32 pieces",
          ctaHref: "/products?category=outerwear",
        },
        {
          title: "Knits",
          subtitle: "44 pieces",
          ctaHref: "/products?category=knits",
        },
        {
          title: "Trousers",
          subtitle: "28 pieces",
          ctaHref: "/products?category=trousers",
        },
        {
          title: "Accessories",
          subtitle: "18 pieces",
          ctaHref: "/products?category=accessories",
        },
      ],
      aspectRatio: "square",
    }),
    block("product-grid", {
      eyebrow: "Just dropped",
      heading: "Most wanted",
      source: "featured",
      limit: 8,
      columns: 4,
      cardVariant: "bordered",
      cardAspectRatio: "3/4",
    }),
    block("story-split", {
      eyebrow: "Process",
      title: "One mill. One cut. One season.",
      body: "Every Fold piece comes from a single mill in Como. We cut once, ship once, and don't restock. When it's gone, it's gone.",
      imageSide: "right",
      ctaLabel: "Read the journal",
      ctaHref: "/blog",
    }),
    block("newsletter", {
      title: "Get first dibs.",
      subtitle: "Drops launch to subscribers 48 hours before public.",
      cta: "Subscribe",
      variant: "banner",
      dark: true,
    }),
  ];
}
