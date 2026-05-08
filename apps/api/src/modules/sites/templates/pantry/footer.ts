/**
 * Pantry template — footer layout
 *
 * Hand-feel labels, warm reds, recipe-style. Niche: food / gourmet.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function pantryFooter(): BlockNode[] {
  resetIdCounter();
  return [
    block("footer-columns", {
      showBrand: true,
      brand: "Pantry & Co.",
      tagline: "A modern pantry, stocked with intention.",
      columns: [
        {
          title: "Shop",
          links: [
            { label: "Oils & vinegars", href: "/products?category=oils" },
            { label: "Spices", href: "/products?category=spices" },
            { label: "Pantry tins", href: "/products?category=tins" },
            { label: "Sweets & ferments", href: "/products?category=sweets" },
          ],
        },
        {
          title: "Eat",
          links: [
            { label: "Recipes", href: "/blog" },
            { label: "Producers", href: "/about" },
            { label: "Pairings", href: "/blog" },
          ],
        },
        {
          title: "Care",
          links: [
            { label: "Shipping", href: "/about" },
            { label: "Returns", href: "/about" },
            { label: "Contact", href: "/contact" },
          ],
        },
      ],
    }),
  ];
}
