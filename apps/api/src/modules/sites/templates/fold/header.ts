/**
 * Fold template — header layout
 *
 * Swiss grid, ruthless typography. White, black, single oxblood accent.
 * Niche: fashion / apparel.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function foldHeader(): BlockNode[] {
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
  ];
}
