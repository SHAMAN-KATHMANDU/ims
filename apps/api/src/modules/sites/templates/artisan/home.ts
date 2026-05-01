/**
 * Artisan template — home layout
 */

import type { BlockNode } from "@repo/shared";
import { block } from "../_shared/factories";

export function artisanHome(): BlockNode[] {
  return [
    block("hero", {
      variant: "luxury",
      title: "From our workshop to your home",
      ctaLabel: "See the work",
      ctaHref: "/products",
    }),
    block("story-split", {
      eyebrow: "Made by hand",
      title: "From our workshop to your home",
      body: "Every piece starts as a conversation with a maker. It ends, months later, as something we're proud to send.",
      imageSide: "left",
      ctaHref: "/about",
      ctaLabel: "Meet the makers",
    }),
    block("bento-showcase", {
      eyebrow: "Featured",
      heading: "Works in the collection",
      source: "featured",
      limit: 5,
    }),
    block("product-grid", {
      heading: "The full shop",
      source: "featured",
      limit: 8,
      columns: 4,
      cardVariant: "bordered",
    }),
    block("policy-strip", {
      layout: "inline",
      items: [
        { label: "Handmade", detail: "Signed by the maker", icon: "warranty" },
        {
          label: "Free shipping",
          detail: "Orders over ₹5,000",
          icon: "shipping",
        },
        { label: "Gift-ready", detail: "Complimentary wrap", icon: "gift" },
        { label: "Lifetime care", detail: "Repairs at cost", icon: "support" },
      ],
    }),
    block("testimonials", {
      heading: "From our collectors",
      items: [
        {
          quote:
            "I've bought four pieces over five years. Every one is still in rotation.",
          author: "Priya S.",
          role: "Bangalore",
        },
        {
          quote: "The detail is extraordinary. Photos don't do it justice.",
          author: "James W.",
          role: "Brooklyn",
        },
        {
          quote: "They remember me by name. Feels like a real shop.",
          author: "Amelia K.",
          role: "Paris",
        },
      ],
    }),
    block("faq", {
      heading: "Before you commission",
      items: [
        {
          question: "How long does a piece take to make?",
          answer:
            "Most work ships in two to four weeks. Larger commissions can run six to eight. We'll give you a date when you order and keep you updated if anything shifts.",
        },
        {
          question: "Can I commission something one-of-a-kind?",
          answer:
            "Yes — write to us with the idea, a budget range, and a rough timeline. We'll come back within a few days with whether we can take it on and what it would cost.",
        },
        {
          question: "How do I care for a handmade piece?",
          answer:
            "Each piece ships with a care card written by the maker. In short: keep it dry, out of direct sun, and reach out if anything needs repair — we cover that at cost for life.",
        },
        {
          question: "Do you ship internationally?",
          answer:
            "Yes, anywhere we can insure. Larger pieces go by freight with signature on delivery.",
        },
      ],
    }),
    block("newsletter", {
      title: "Join the circle",
      subtitle: "Occasional letters, never sales-y.",
      cta: "Subscribe",
    }),
  ];
}
