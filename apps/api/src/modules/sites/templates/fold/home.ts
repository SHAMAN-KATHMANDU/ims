/**
 * Fold template — home layout
 *
 * Swiss grid, ruthless typography. White, black, single oxblood accent.
 * Niche: fashion / apparel.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function foldHome(): BlockNode[] {
  resetIdCounter();
  return [
    block("announcement-bar", {
      text: "Free shipping over ₹5,000 · Returns within 30 days",
      marquee: true,
      tone: "default",
      items: [
        "Free shipping over ₹5,000",
        "30-day returns",
        "International delivery",
        "Sustainably made",
      ],
    }),
    block("nav-bar", {
      brand: "FOLD",
      brandStyle: "sans",
      items: [
        { label: "New", href: "/products?sort=newest" },
        { label: "Women", href: "/products?category=women" },
        { label: "Men", href: "/products?category=men" },
        { label: "Sale", href: "/offers" },
        { label: "Stories", href: "/blog" },
      ],
      showSearch: true,
      showCart: true,
      showAccount: true,
      sticky: true,
      align: "between",
    }),
    block("hero", {
      variant: "minimal",
      heroLayout: "split-left",
      title: "Less, but louder.",
      subtitle: "AW26. Pieces built around a single oxblood accent.",
      ctaLabel: "Shop AW26",
      ctaHref: "/products",
    }),
    block("collection-cards", {
      heading: "Departments",
      cards: [
        {
          title: "Outerwear",
          subtitle: "32 pieces",
          ctaHref: "/products?category=outerwear",
        },
        {
          title: "Knits",
          subtitle: "44 pieces",
          ctaHref: "/products?category=knits",
        },
        {
          title: "Trousers",
          subtitle: "28 pieces",
          ctaHref: "/products?category=trousers",
        },
        {
          title: "Accessories",
          subtitle: "18 pieces",
          ctaHref: "/products?category=accessories",
        },
      ],
      aspectRatio: "square",
    }),
    block("product-grid", {
      eyebrow: "Just dropped",
      heading: "Most wanted",
      source: "featured",
      limit: 8,
      columns: 4,
      cardVariant: "bordered",
      cardAspectRatio: "3/4",
    }),
    block("story-split", {
      eyebrow: "Process",
      title: "One mill. One cut. One season.",
      body: "Every Fold piece comes from a single mill in Como. We cut once, ship once, and don't restock. When it's gone, it's gone.",
      imageSide: "right",
      ctaLabel: "Read the journal",
      ctaHref: "/blog",
    }),
    block("newsletter", {
      title: "Get first dibs.",
      subtitle: "Drops launch to subscribers 48 hours before public.",
      cta: "Subscribe",
      variant: "banner",
      dark: true,
    }),
    block("footer-columns", {
      showBrand: true,
      brand: "FOLD",
      tagline: "Less, but louder.",
      columns: [
        {
          title: "Shop",
          links: [
            { label: "New", href: "/products?sort=newest" },
            { label: "Women", href: "/products?category=women" },
            { label: "Men", href: "/products?category=men" },
            { label: "Sale", href: "/offers" },
          ],
        },
        {
          title: "About",
          links: [
            { label: "The mill", href: "/about" },
            { label: "Sustainability", href: "/about" },
            { label: "Journal", href: "/blog" },
          ],
        },
        {
          title: "Help",
          links: [
            { label: "Shipping", href: "/about" },
            { label: "Returns", href: "/about" },
            { label: "Size guide", href: "/about" },
            { label: "Contact", href: "/contact" },
          ],
        },
      ],
    }),
  ];
}
