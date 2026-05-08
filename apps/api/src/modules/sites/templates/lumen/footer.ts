/**
 * Lumen template — footer layout
 *
 * Soft blush gradients, italic serif, generous whitespace. Niche: beauty / cosmetics.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function lumenFooter(): BlockNode[] {
  resetIdCounter();
  return [
    block("footer-columns", {
      showBrand: true,
      brand: "Lumen",
      tagline: "Slow skincare. Made in small batches in Lisbon.",
      columns: [
        {
          title: "Shop",
          links: [
            { label: "Skincare", href: "/products?category=skincare" },
            { label: "Makeup", href: "/products?category=makeup" },
            { label: "Bath & body", href: "/products?category=bath" },
            { label: "Sets", href: "/products?category=sets" },
          ],
        },
        {
          title: "Rituals",
          links: [
            { label: "Journal", href: "/blog" },
            { label: "Ingredient index", href: "/about" },
            { label: "Quiz", href: "/about" },
          ],
        },
        {
          title: "Care",
          links: [
            { label: "Sample policy", href: "/about" },
            { label: "Returns", href: "/about" },
            { label: "Contact", href: "/contact" },
          ],
        },
      ],
    }),
  ];
}
