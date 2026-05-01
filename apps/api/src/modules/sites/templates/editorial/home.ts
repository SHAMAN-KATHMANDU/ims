/**
 * Editorial template — home layout
 */

import type { BlockNode } from "@repo/shared";
import { block } from "../_shared/factories";

export function editorialHome(): BlockNode[] {
  // Tall editorial hero → trust → category tiles → big product grid →
  // story split → bento → stats → testimonials → FAQ → newsletter.
  return [
    block("hero", {
      variant: "editorial",
      title: "Curated for the discerning eye",
      ctaLabel: "Shop the collection",
      ctaHref: "/products",
    }),
    block("trust-strip", {
      items: [
        { label: "Handcrafted", value: "By artisans" },
        { label: "Shipping", value: "Free over ₹5,000" },
        { label: "Returns", value: "30 days" },
        { label: "Support", value: "Mon–Sat" },
      ],
    }),
    block("category-tiles", {
      heading: "Shop by category",
      columns: 3,
      aspectRatio: "4/5",
    }),
    block("product-grid", {
      eyebrow: "New arrivals",
      heading: "Just in",
      source: "featured",
      limit: 8,
      columns: 4,
      cardVariant: "bordered",
    }),
    block("story-split", {
      eyebrow: "Our story",
      title: "Crafted with intention",
      body: "Every piece in our collection is the result of countless hours of careful work by artisans we've known for years. No two are quite alike, and that's the point.",
      imageSide: "left",
      ctaHref: "/about",
      ctaLabel: "Read more",
    }),
    block("bento-showcase", {
      eyebrow: "Featured",
      heading: "Worth a closer look",
      source: "featured",
      limit: 5,
    }),
    block("stats-band", {
      items: [
        { value: "12 yrs", label: "Crafting" },
        { value: "42", label: "Artisans" },
        { value: "6k+", label: "Happy customers" },
      ],
    }),
    block("testimonials", {
      heading: "What people say",
      items: [
        {
          quote:
            "The quality is unreal. Everything arrives packed like it matters — because it does.",
          author: "Aditi R.",
          role: "Mumbai",
        },
        {
          quote:
            "I've bought three pieces and each one is better than the last.",
          author: "Marcus T.",
          role: "London",
        },
      ],
    }),
    block("faq", {
      heading: "Frequently asked",
      items: [
        {
          question: "Do you ship internationally?",
          answer:
            "Yes, to 60+ countries. Standard delivery runs 7–12 business days.",
        },
        {
          question: "What is your return policy?",
          answer:
            "30-day returns on everything except final-sale items. We cover the return label for domestic orders.",
        },
        {
          question: "Are the pieces really handcrafted?",
          answer:
            "Every single one. We work directly with a small roster of artisans — no factories, no contractors.",
        },
        {
          question: "Do you offer gift wrapping?",
          answer:
            "Yes — optional at checkout. Each gift box comes with a hand-written card if you include a message.",
        },
      ],
    }),
    block("newsletter", {
      title: "Stay in the loop",
      subtitle: "Occasional updates from the workshop.",
      cta: "Subscribe",
    }),
  ];
}
