/**
 * Verdant template — header layout
 *
 * Forest-floor palette. Botanical serif, soil-tone surfaces.
 * Niche: plants / garden.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function verdantHeader(): BlockNode[] {
  resetIdCounter();
  return [
    block("announcement-bar", {
      text: "Plants ship in eco-friendly packaging · Free care guide with every order",
      marquee: false,
      tone: "muted",
    }),
    block("nav-bar", {
      variant: "centered",
      brand: "Verdant",
      brandStyle: "serif",
      items: [
        { label: "Indoor", href: "/products?category=indoor" },
        { label: "Outdoor", href: "/products?category=outdoor" },
        { label: "Pots & vessels", href: "/products?category=pots" },
        { label: "Care guide", href: "/blog" },
      ],
      showSearch: true,
      showCart: true,
      showAccount: true,
      sticky: true,
      align: "between",
    }),
  ];
}
