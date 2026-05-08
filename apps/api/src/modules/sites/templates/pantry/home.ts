/**
 * Pantry template — home layout
 *
 * Hand-feel labels, warm reds, recipe-style. Niche: food / gourmet.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function pantryHome(): BlockNode[] {
  resetIdCounter();
  return [
    block("hero", {
      variant: "boutique",
      heroLayout: "split-left",
      title: "From small farms, in small batches.",
      subtitle:
        "A modern pantry of single-origin oils, hand-tinned anchovies, and spices ground to order.",
      ctaLabel: "Shop the pantry",
      ctaHref: "/products",
    }),
    block("collection-cards", {
      eyebrow: "By aisle",
      heading: "Stock up",
      cards: [
        {
          title: "Olive oils",
          subtitle: "8 single-origin labels",
          ctaHref: "/products?category=oils",
        },
        {
          title: "Tinned fish",
          subtitle: "Conservas from Galicia",
          ctaHref: "/products?category=tins",
        },
        {
          title: "Spices",
          subtitle: "Ground to order",
          ctaHref: "/products?category=spices",
        },
      ],
      aspectRatio: "portrait",
    }),
    block("story-split", {
      eyebrow: "Recipe of the month",
      title: "Cacio e pepe with our '24 oil.",
      body: "A 4-ingredient pasta that's all about the olive oil. We've published the recipe and matched it to our newest single-origin label.",
      imageSide: "right",
      ctaLabel: "Read the recipe",
      ctaHref: "/blog",
    }),
    block("product-grid", {
      eyebrow: "Bestsellers",
      heading: "What people stock most",
      source: "featured",
      limit: 8,
      columns: 4,
      cardVariant: "bordered",
      cardAspectRatio: "1/1",
    }),
    block("policy-strip", {
      heading: "What you can count on",
      items: [
        {
          label: "Small batch",
          icon: "warranty",
          detail: "Made in lots of <2,000",
        },
        { label: "Cold-chain", icon: "shipping", detail: "Where it matters" },
        {
          label: "Pantry returns",
          icon: "returns",
          detail: "Even on opened tins",
        },
      ],
      layout: "inline",
      columns: 3,
    }),
    block("newsletter", {
      title: "The Pantry Letter",
      subtitle: "A new recipe and a single-origin spotlight, every other week.",
      cta: "Subscribe",
      variant: "card",
    }),
  ];
}
