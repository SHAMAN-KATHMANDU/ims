/**
 * Maison template — footer layout
 *
 * Editorial warmth. Oak-and-clay palette, generous serif display, full-bleed
 * hero, three "rooms" collection cards, atelier promo, press testimonials.
 * Niche: interior design / furniture.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function maisonFooter(): BlockNode[] {
  resetIdCounter();
  return [
    block("footer-columns", {
      showBrand: true,
      brand: "Maison",
      tagline:
        "Furniture for quiet rooms. Designed in Brooklyn, made in High Point, NC. Since 1998.",
      columns: [
        {
          title: "Shop",
          links: [
            { label: "Living", href: "/products?category=living" },
            { label: "Dining", href: "/products?category=dining" },
            { label: "Bedroom", href: "/products?category=bedroom" },
            { label: "Outdoor", href: "/products?category=outdoor" },
            { label: "Lighting", href: "/products?category=lighting" },
          ],
        },
        {
          title: "The House",
          links: [
            { label: "Our makers", href: "/about" },
            { label: "Showrooms", href: "/contact" },
            { label: "Trade program", href: "/contact" },
            { label: "Journal", href: "/blog" },
          ],
        },
        {
          title: "Service",
          links: [
            { label: "Delivery & assembly", href: "/about" },
            { label: "Care guides", href: "/blog" },
            { label: "Returns", href: "/about" },
            { label: "Contact", href: "/contact" },
          ],
        },
      ],
    }),
  ];
}
