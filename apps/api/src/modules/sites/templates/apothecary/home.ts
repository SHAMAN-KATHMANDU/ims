/**
 * Apothecary template — home layout
 */

import type { BlockNode } from "@repo/shared";
import { block } from "../_shared/factories";

export function apothecaryHome(): BlockNode[] {
  return [
    block("hero", {
      variant: "standard",
      title: "Nature's finest remedies",
      subtitle: "Botanical formulas, handcrafted with care",
      ctaLabel: "Shop remedies",
      ctaHref: "/products",
    }),
    block("trust-strip", {
      items: [
        { label: "Botanical", value: "Sourced" },
        { label: "Small batch", value: "Handmade" },
        { label: "Third-party", value: "Tested" },
        { label: "Cruelty", value: "Free" },
      ],
    }),
    block("category-tiles", {
      heading: "Browse the shelves",
      columns: 4,
      aspectRatio: "3/4",
    }),
    block("product-grid", {
      heading: "Best sellers",
      source: "featured",
      limit: 8,
      columns: 4,
      cardVariant: "card",
    }),
    block("story-split", {
      eyebrow: "Since 2012",
      title: "A small apothecary",
      body: "We founded the shop with one idea: make things that work, from ingredients you can pronounce.",
      imageSide: "left",
      ctaHref: "/about",
      ctaLabel: "Our story",
    }),
    block("testimonials", {
      heading: "Kind words from the shelves",
      layout: "stacked",
      items: [
        {
          quote:
            "The rosehip balm cleared up a dryness nothing else would touch. I buy it in threes now.",
          author: "Leela N.",
          role: "Goa",
        },
        {
          quote:
            "Everything smells like a garden, not a lab. My grandmother would approve.",
          author: "Helen B.",
          role: "Edinburgh",
        },
      ],
    }),
    block("faq", {
      heading: "Common questions",
      items: [
        {
          question: "Are the ingredients tested on animals?",
          answer: "Never.",
        },
        {
          question: "Do you ship internationally?",
          answer: "Yes, to 40+ countries.",
        },
        {
          question: "How long do the products last?",
          answer:
            "Most unopened products last 12–18 months; check the label after opening.",
        },
      ],
    }),
    block("newsletter", {
      title: "Join the list",
      subtitle: "New formulas, restocks, and seasonal picks.",
      cta: "Subscribe",
    }),
  ];
}
