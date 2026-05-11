/**
 * Auric template — footer layout
 *
 * Cream-on-cream luxury. Hairline rules, italic display, gold accent.
 * Niche: jewelry / accessories.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function auricFooter(): BlockNode[] {
  resetIdCounter();
  return [
    block("footer-columns", {
      variant: "standard",
      showBrand: true,
      brand: "Auric",
      tagline:
        "Hand-finished gold pieces. Bench-made in Jaipur, designed in Bombay.",
      columns: [
        {
          title: "Shop",
          links: [
            { label: "Rings", href: "/products?category=rings" },
            { label: "Necklaces", href: "/products?category=necklaces" },
            { label: "Earrings", href: "/products?category=earrings" },
            { label: "Bridal", href: "/products?category=bridal" },
          ],
        },
        {
          title: "The Atelier",
          links: [
            { label: "Our craft", href: "/about" },
            { label: "Materials", href: "/about" },
            { label: "Bespoke", href: "/contact" },
          ],
        },
        {
          title: "Care",
          links: [
            { label: "Engraving", href: "/about" },
            { label: "Lifetime polishing", href: "/about" },
            { label: "Returns", href: "/about" },
          ],
        },
      ],
    }),
  ];
}
