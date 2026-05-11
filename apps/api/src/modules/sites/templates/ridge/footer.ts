/**
 * Ridge// template — footer layout
 *
 * High-contrast performance. Italic mono numerals, oversized CTAs, tactical
 * orange. Niche: sports / fitness.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function ridgeFooter(): BlockNode[] {
  resetIdCounter();
  return [
    block("footer-columns", {
      variant: "minimal",
      showBrand: true,
      brand: "RIDGE//",
      tagline: "Performance gear for the next attempt.",
      columns: [
        {
          title: "Shop",
          links: [
            { label: "Run", href: "/products?category=run" },
            { label: "Train", href: "/products?category=train" },
            { label: "Outdoor", href: "/products?category=outdoor" },
            { label: "Drops", href: "/offers" },
          ],
        },
        {
          title: "Field",
          links: [
            { label: "Field log", href: "/blog" },
            { label: "Athletes", href: "/about" },
            { label: "Sustainability", href: "/about" },
          ],
        },
        {
          title: "Service",
          links: [
            { label: "Returns", href: "/about" },
            { label: "Sizing", href: "/about" },
            { label: "Contact", href: "/contact" },
          ],
        },
      ],
    }),
  ];
}
