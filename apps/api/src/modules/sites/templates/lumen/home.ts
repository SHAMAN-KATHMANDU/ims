/**
 * Lumen template — home layout
 *
 * Soft blush gradients, italic serif, generous whitespace. Niche: beauty / cosmetics.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function lumenHome(): BlockNode[] {
  resetIdCounter();
  return [
    block("announcement-bar", {
      text: "Free samples with every order · Complimentary returns",
      marquee: false,
      tone: "muted",
    }),
    block("nav-bar", {
      brand: "Lumen",
      brandStyle: "serif",
      items: [
        { label: "Skincare", href: "/products?category=skincare" },
        { label: "Makeup", href: "/products?category=makeup" },
        { label: "Bath & body", href: "/products?category=bath" },
        { label: "Rituals", href: "/blog" },
      ],
      showSearch: true,
      showCart: true,
      showAccount: true,
      sticky: true,
      align: "center",
    }),
    block("hero", {
      variant: "boutique",
      heroLayout: "centered",
      title: "A softer skin, slowly.",
      subtitle:
        "Slow skincare for the patient. Plant actives, no fragrance, no rush.",
      ctaLabel: "Discover the ritual",
      ctaHref: "/products",
    }),
    block("collection-cards", {
      eyebrow: "Curated",
      heading: "By concern",
      cards: [
        {
          title: "Calm + repair",
          subtitle: "For redness & sensitivity",
          ctaHref: "/products?tag=calm",
        },
        {
          title: "Glow + tone",
          subtitle: "For dullness & texture",
          ctaHref: "/products?tag=glow",
        },
        {
          title: "Hydrate + plump",
          subtitle: "For dryness & lines",
          ctaHref: "/products?tag=hydrate",
        },
      ],
      aspectRatio: "portrait",
    }),
    block("bento-showcase", {
      eyebrow: "Hero products",
      heading: "Most-loved",
      source: "featured",
      limit: 5,
    }),
    block("testimonials", {
      heading: "What people say",
      items: [
        {
          quote:
            "Three weeks in and my skin barrier is back. I cannot recommend enough.",
          author: "Priya K.",
          role: "Mumbai",
        },
        {
          quote:
            "It's the only serum I've finished a whole bottle of in a year.",
          author: "Jen M.",
          role: "London",
        },
      ],
      layout: "grid",
      columns: 2,
    }),
    block("newsletter", {
      title: "Notes from the lab",
      subtitle:
        "A monthly letter on actives, formulation, and skin in real life.",
      cta: "Sign up",
      variant: "card",
    }),
    block("footer-columns", {
      showBrand: true,
      brand: "Lumen",
      tagline: "Slow skincare. Made in small batches in Lisbon.",
      columns: [
        {
          title: "Shop",
          links: [
            { label: "Skincare", href: "/products?category=skincare" },
            { label: "Makeup", href: "/products?category=makeup" },
            { label: "Bath & body", href: "/products?category=bath" },
            { label: "Sets", href: "/products?category=sets" },
          ],
        },
        {
          title: "Rituals",
          links: [
            { label: "Journal", href: "/blog" },
            { label: "Ingredient index", href: "/about" },
            { label: "Quiz", href: "/about" },
          ],
        },
        {
          title: "Care",
          links: [
            { label: "Sample policy", href: "/about" },
            { label: "Returns", href: "/about" },
            { label: "Contact", href: "/contact" },
          ],
        },
      ],
    }),
  ];
}
