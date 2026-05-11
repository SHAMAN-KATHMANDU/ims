/**
 * Auric template — header layout
 *
 * Cream-on-cream luxury. Hairline rules, italic display, gold accent.
 * Niche: jewelry / accessories.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function auricHeader(): BlockNode[] {
  resetIdCounter();
  return [
    block("announcement-bar", {
      text: "Complimentary engraving on rings & pendants",
      marquee: false,
      tone: "muted",
    }),
    block("nav-bar", {
      variant: "centered",
      brand: "Auric",
      brandStyle: "serif",
      items: [
        { label: "Rings", href: "/products?category=rings" },
        { label: "Necklaces", href: "/products?category=necklaces" },
        { label: "Earrings", href: "/products?category=earrings" },
        { label: "The Atelier", href: "/about" },
      ],
      showSearch: true,
      showCart: true,
      showAccount: true,
      align: "center",
    }),
  ];
}
