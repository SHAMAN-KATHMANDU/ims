/**
 * Volt template — home layout
 *
 * Deep-night UI, lime accent, monospaced specs, glow & grid.
 * Niche: electronics / gadgets.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function voltHome(): BlockNode[] {
  resetIdCounter();
  return [
    block("announcement-bar", {
      text: "▲ NEW: Volt Pro · Free 2-day shipping in metro cities",
      marquee: false,
      tone: "accent",
    }),
    block("nav-bar", {
      brand: "▲ VOLT",
      brandStyle: "mono",
      items: [
        { label: "Audio", href: "/products?category=audio" },
        { label: "Wearables", href: "/products?category=wearables" },
        { label: "Charging", href: "/products?category=charging" },
        { label: "Compare", href: "/products" },
      ],
      showSearch: true,
      showCart: true,
      showAccount: true,
      sticky: true,
      align: "between",
    }),
    block("hero", {
      variant: "shoppable",
      heroLayout: "split-right",
      title: "Sound, charged.",
      subtitle:
        "Audio gear engineered for one thing — uncluttered listening, all day.",
      ctaLabel: "See all gear",
      ctaHref: "/products",
    }),
    block("collection-cards", {
      heading: "By category",
      cards: [
        {
          title: "Headphones",
          subtitle: "Over-ear & IEMs",
          ctaHref: "/products?category=audio",
        },
        {
          title: "Wearables",
          subtitle: "Fitness & sleep",
          ctaHref: "/products?category=wearables",
        },
        {
          title: "Charging",
          subtitle: "Wireless & GaN",
          ctaHref: "/products?category=charging",
        },
      ],
      aspectRatio: "square",
    }),
    block("product-grid", {
      eyebrow: "New gear",
      heading: "Just shipped",
      source: "newest",
      limit: 8,
      columns: 4,
      cardVariant: "card",
      cardAspectRatio: "1/1",
      showPrice: true,
    }),
    block("story-split", {
      eyebrow: "Engineering",
      title: "Spec'd for what you'll actually do.",
      body: "We don't ship feature creep. Every Volt product is the smallest, lightest, longest-lasting version that does its one job extremely well.",
      imageSide: "left",
      ctaLabel: "Read the engineering log",
      ctaHref: "/blog",
    }),
    block("stats-band", {
      items: [
        { value: "48h", label: "Battery life" },
        { value: "<2g", label: "Per earbud" },
        { value: "4 yrs", label: "Warranty" },
      ],
      dark: true,
      alignment: "center",
      valueSize: "xl",
    }),
    block("footer-columns", {
      showBrand: true,
      brand: "▲ VOLT",
      tagline: "Audio gear, engineered tight.",
      columns: [
        {
          title: "Shop",
          links: [
            { label: "Audio", href: "/products?category=audio" },
            { label: "Wearables", href: "/products?category=wearables" },
            { label: "Charging", href: "/products?category=charging" },
            { label: "Compare", href: "/products" },
          ],
        },
        {
          title: "Engineering",
          links: [
            { label: "Spec sheets", href: "/blog" },
            { label: "Engineering log", href: "/blog" },
            { label: "Sustainability", href: "/about" },
          ],
        },
        {
          title: "Support",
          links: [
            { label: "Warranty", href: "/about" },
            { label: "Returns", href: "/about" },
            { label: "Contact", href: "/contact" },
          ],
        },
      ],
    }),
  ];
}
