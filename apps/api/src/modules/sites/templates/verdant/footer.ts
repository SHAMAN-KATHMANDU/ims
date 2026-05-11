/**
 * Verdant template — footer layout
 *
 * Forest-floor palette. Botanical serif, soil-tone surfaces.
 * Niche: plants / garden.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function verdantFooter(): BlockNode[] {
  resetIdCounter();
  return [
    block("footer-columns", {
      variant: "centered",
      showBrand: true,
      brand: "Verdant",
      tagline: "Hand-grown plants from a working nursery north of Pune.",
      columns: [
        {
          title: "Shop",
          links: [
            { label: "Indoor", href: "/products?category=indoor" },
            { label: "Outdoor", href: "/products?category=outdoor" },
            { label: "Pots & vessels", href: "/products?category=pots" },
          ],
        },
        {
          title: "Garden",
          links: [
            { label: "Care guide", href: "/blog" },
            { label: "Nursery", href: "/about" },
            { label: "Workshops", href: "/contact" },
          ],
        },
        {
          title: "Care",
          links: [
            { label: "Plant guarantee", href: "/about" },
            { label: "Shipping", href: "/about" },
            { label: "Contact", href: "/contact" },
          ],
        },
      ],
    }),
  ];
}
