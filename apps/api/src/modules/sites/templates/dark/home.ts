/**
 * Dark template — home layout
 */

import type { BlockNode } from "@repo/shared";
import { block } from "../_shared/factories";

export function darkHome(): BlockNode[] {
  // Dark moodboard. Bento showcase is the headline, products second.
  return [
    block("hero", {
      variant: "editorial",
      title: "Design that takes a position",
      subtitle: "Bold choices, no compromise",
      ctaLabel: "Enter the collection",
      ctaHref: "/products",
    }),
    block("bento-showcase", {
      eyebrow: "Featured",
      heading: "This month's drop",
      source: "featured",
      limit: 5,
    }),
    block("product-grid", {
      heading: "Latest",
      source: "newest",
      limit: 8,
      columns: 4,
      cardVariant: "card",
    }),
    block("stats-band", {
      dark: true,
      items: [
        { value: "24hrs", label: "Dispatch" },
        { value: "∞", label: "Replays" },
        { value: "12", label: "Countries" },
      ],
    }),
    block("story-split", {
      eyebrow: "Manifesto",
      title: "Design is an argument",
      body: "Every piece takes a position. We're not interested in the middle.",
      imageSide: "left",
    }),
    block("testimonials", {
      heading: "Field notes",
      layout: "grid",
      items: [
        {
          quote:
            "Nothing apologetic about this work. You can tell someone made a decision and committed.",
          author: "Tomás R.",
          role: "Barcelona",
        },
        {
          quote:
            "Bought the chair eighteen months ago. Still the best object in the house.",
          author: "Nina K.",
          role: "Berlin",
        },
      ],
    }),
    block("policy-strip", {
      layout: "inline",
      dark: true,
      items: [
        { label: "Free shipping", detail: "Over ₹5,000", icon: "shipping" },
        { label: "Secure checkout", detail: "256-bit SSL", icon: "secure" },
        { label: "30-day returns", detail: "No questions", icon: "returns" },
      ],
    }),
    block("blog-list", { heading: "From the journal", limit: 3, columns: 3 }),
    block("newsletter", {
      title: "Get notified",
      subtitle: "First access to every drop.",
      cta: "Notify me",
    }),
  ];
}
