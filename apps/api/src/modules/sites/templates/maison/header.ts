/**
 * Maison template — header layout
 *
 * Editorial warmth. Oak-and-clay palette, generous serif display, full-bleed
 * hero, three "rooms" collection cards, atelier promo, press testimonials.
 * Niche: interior design / furniture.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function maisonHeader(): BlockNode[] {
  resetIdCounter();
  return [
    block("announcement-bar", {
      text: "Free white-glove delivery on orders over ₹120,000 · Trade pricing for designers",
      marquee: false,
      tone: "default",
    }),
    block("nav-bar", {
      variant: "standard",
      brand: "Maison",
      brandStyle: "serif",
      items: [
        { label: "Living", href: "/products?category=living" },
        { label: "Dining", href: "/products?category=dining" },
        { label: "Bedroom", href: "/products?category=bedroom" },
        { label: "Outdoor", href: "/products?category=outdoor" },
        { label: "Lighting", href: "/products?category=lighting" },
      ],
      showSearch: true,
      showAccount: true,
      showCart: true,
      sticky: true,
      align: "between",
    }),
  ];
}
