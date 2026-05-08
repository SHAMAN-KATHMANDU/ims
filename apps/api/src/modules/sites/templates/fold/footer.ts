/**
 * Fold template — footer layout
 *
 * Swiss grid, ruthless typography. White, black, single oxblood accent.
 * Niche: fashion / apparel.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function foldFooter(): BlockNode[] {
  resetIdCounter();
  return [
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
