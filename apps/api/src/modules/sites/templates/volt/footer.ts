/**
 * Volt template — footer layout
 *
 * Deep-night UI, lime accent, monospaced specs, glow & grid.
 * Niche: electronics / gadgets.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function voltFooter(): BlockNode[] {
  resetIdCounter();
  return [
    block("footer-columns", {
      variant: "dark",
      showBrand: true,
      brand: "▲ VOLT",
      tagline: "Audio gear, engineered tight.",
      columns: [
        {
          title: "Shop",
          links: [
            { label: "Audio", href: "/products?category=audio" },
            { label: "Wearables", href: "/products?category=wearables" },
            { label: "Charging", href: "/products?category=charging" },
            { label: "Compare", href: "/products" },
          ],
        },
        {
          title: "Engineering",
          links: [
            { label: "Spec sheets", href: "/blog" },
            { label: "Engineering log", href: "/blog" },
            { label: "Sustainability", href: "/about" },
          ],
        },
        {
          title: "Support",
          links: [
            { label: "Warranty", href: "/about" },
            { label: "Returns", href: "/about" },
            { label: "Contact", href: "/contact" },
          ],
        },
      ],
    }),
  ];
}
