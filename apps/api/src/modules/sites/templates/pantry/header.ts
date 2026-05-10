/**
 * Pantry template — header layout
 *
 * Hand-feel labels, warm reds, recipe-style. Niche: food / gourmet.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function pantryHeader(): BlockNode[] {
  resetIdCounter();
  return [
    block("announcement-bar", {
      text: "Free shipping on orders over ₹2,500 · Pantry restocks weekly",
      marquee: false,
      tone: "default",
    }),
    block("nav-bar", {
      variant: "standard",
      brand: "Pantry & Co.",
      brandStyle: "serif",
      items: [
        { label: "Oils & vinegars", href: "/products?category=oils" },
        { label: "Spices", href: "/products?category=spices" },
        { label: "Pantry tins", href: "/products?category=tins" },
        { label: "Recipes", href: "/blog" },
      ],
      showSearch: true,
      showCart: true,
      showAccount: true,
      sticky: true,
      align: "between",
    }),
  ];
}
