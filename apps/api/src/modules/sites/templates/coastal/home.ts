/**
 * Coastal template — home layout
 */

import type { BlockNode } from "@repo/shared";
import { block } from "../_shared/factories";

export function coastalHome(): BlockNode[] {
  return [
    block("hero", {
      variant: "boutique",
      title: "Made near the sea",
      subtitle: "Light, easy, California-inspired",
      ctaLabel: "Shop the lookbook",
      ctaHref: "/products",
    }),
    block("category-tiles", {
      heading: "By the water",
      columns: 3,
      aspectRatio: "16/9",
    }),
    block("product-grid", {
      eyebrow: "Summer",
      heading: "Pieces for warmer days",
      source: "newest",
      limit: 8,
      columns: 4,
      cardVariant: "bordered",
    }),
    block("story-split", {
      eyebrow: "On the coast",
      title: "Made near the sea",
      body: "Our studio sits three blocks from the water. Everything we make carries a little of that air.",
      imageSide: "right",
    }),
    block("bento-showcase", {
      heading: "Favorites",
      source: "featured",
      limit: 5,
    }),
    block("testimonials", {
      heading: "Postcards from customers",
      layout: "carousel",
      items: [
        {
          quote:
            "Wore the linen shirt straight from the plane to the beach and it looked better by sunset. Feels like summer.",
          author: "Maya A.",
          role: "Santa Monica",
        },
        {
          quote:
            "The towel set is now in every beach bag in our family. Good weight, dries fast, ages beautifully.",
          author: "Ravi K.",
          role: "Kovalam",
        },
        {
          quote:
            "Packaging is plastic-free and actually pretty. Small touches matter.",
          author: "Jules P.",
          role: "Bondi",
        },
      ],
    }),
    block("policy-strip", {
      layout: "grid",
      columns: 4,
      items: [
        {
          label: "Free shipping",
          detail: "Orders over ₹3,000",
          icon: "shipping",
        },
        { label: "Easy returns", detail: "30-day window", icon: "returns" },
        {
          label: "Secure payment",
          detail: "Encrypted checkout",
          icon: "secure",
        },
        { label: "We're here", detail: "Mon–Sat support", icon: "support" },
      ],
    }),
    block("blog-list", { heading: "From the journal", limit: 3, columns: 3 }),
    block("newsletter", {
      title: "Summer notes",
      subtitle: "No more than one email a month.",
      cta: "Subscribe",
    }),
  ];
}
