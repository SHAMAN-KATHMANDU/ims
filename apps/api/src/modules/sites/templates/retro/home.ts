/**
 * Retro template — home layout
 */

import type { BlockNode } from "@repo/shared";
import { block } from "../_shared/factories";

export function retroHome(): BlockNode[] {
  return [
    block("hero", {
      variant: "standard",
      title: "Classics never go out of style",
      subtitle: "Timeless design, modern quality",
      ctaLabel: "Shop now",
      ctaHref: "/products",
    }),
    block("stats-band", {
      items: [
        { value: "40 yrs", label: "Running" },
        { value: "1k+", label: "Products" },
        { value: "100%", label: "Ours" },
      ],
    }),
    block("product-grid", {
      eyebrow: "Classics",
      heading: "The collection",
      source: "newest",
      limit: 12,
      columns: 4,
      cardVariant: "card",
    }),
    block("bento-showcase", {
      heading: "Featured",
      source: "featured",
      limit: 5,
    }),
    block("trust-strip", {
      items: [
        { label: "Free", value: "Shipping" },
        { label: "30 day", value: "Returns" },
        { label: "Secure", value: "Checkout" },
      ],
    }),
    block("testimonials", {
      heading: "Since day one",
      layout: "carousel",
      items: [
        {
          quote:
            "Been buying here since the 80s. Same family, same quality, same welcome.",
          author: "Harold C.",
          role: "Hyderabad",
        },
        {
          quote:
            "You can't find this stuff anywhere else. Classic fit, built to outlast fashion.",
          author: "Ellen M.",
          role: "Dublin",
        },
        {
          quote: "Perfect gift shop for the hard-to-please uncle.",
          author: "Priyal S.",
          role: "Pune",
        },
      ],
    }),
    block("blog-list", { heading: "From the journal", limit: 3, columns: 3 }),
    block("newsletter", {
      title: "Don't miss a drop",
      subtitle: "Get new arrivals first.",
      cta: "Sign up",
    }),
  ];
}
