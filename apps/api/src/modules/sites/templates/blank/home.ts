/**
 * Blank template — home layout
 */

import type { BlockNode } from "@repo/shared";
import { block } from "../_shared/factories";

export function blankHome(): BlockNode[] {
  // New-tenant default blueprint. Deliberately NOT minimal — every new
  // store gets a full, polished home out of the box (hero, trust-strip,
  // product-grid, story-split, testimonials, policy-strip, newsletter).
  // Tenants delete what they don't want rather than staring at an empty
  // canvas and wondering what's possible. Keep copy as generic placeholders
  // so it's obvious they need replacing before launch.
  return [
    block("hero", {
      variant: "standard",
      title: "Welcome to your store",
      subtitle: "Replace this headline with your brand's promise.",
      ctaLabel: "Shop the collection",
      ctaHref: "/products",
    }),
    block("trust-strip", {
      items: [
        { label: "Free shipping", value: "Over ₹2,000" },
        { label: "Easy returns", value: "30 days" },
        { label: "Secure checkout", value: "SSL" },
        { label: "Real support", value: "Mon–Sat" },
      ],
    }),
    block("product-grid", {
      eyebrow: "Featured",
      heading: "Shop our picks",
      source: "featured",
      limit: 8,
      columns: 4,
      cardVariant: "card",
    }),
    block("story-split", {
      eyebrow: "Our story",
      title: "A short line about who you are",
      body: "Use this space to tell visitors why your store exists — what you care about, who you make for, and what makes your picks different. Two or three sentences is plenty.",
      imageSide: "right",
      ctaHref: "/about",
      ctaLabel: "Learn more",
    }),
    block("testimonials", {
      heading: "What customers say",
      layout: "grid",
      columns: 3,
      items: [
        {
          quote:
            "Replace with a real customer quote once you have one — short, specific, and under 25 words works best.",
          author: "A. Shopper",
          role: "Verified buyer",
        },
        {
          quote:
            "A second quote helps buyers see themselves here. Two or three testimonials is the sweet spot.",
          author: "B. Reviewer",
          role: "Loyal customer",
        },
        {
          quote: "Swap these placeholders for real reviews before you launch.",
          author: "C. Fan",
          role: "Repeat buyer",
        },
      ],
    }),
    block("policy-strip", {
      layout: "grid",
      columns: 4,
      items: [
        {
          label: "Free shipping",
          detail: "On orders over ₹2,000",
          icon: "shipping",
        },
        {
          label: "30-day returns",
          detail: "No-questions-asked",
          icon: "returns",
        },
        {
          label: "Secure payment",
          detail: "Encrypted checkout",
          icon: "secure",
        },
        { label: "We're here", detail: "Mon–Sat support", icon: "support" },
      ],
    }),
    block("newsletter", {
      title: "Join the list",
      subtitle: "Occasional updates — no spam.",
      cta: "Subscribe",
      variant: "inline",
    }),
  ];
}
