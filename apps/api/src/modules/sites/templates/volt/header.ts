/**
 * Volt template — header layout
 *
 * Deep-night UI, lime accent, monospaced specs, glow & grid.
 * Niche: electronics / gadgets.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function voltHeader(): BlockNode[] {
  resetIdCounter();
  return [
    block("announcement-bar", {
      text: "▲ NEW: Volt Pro · Free 2-day shipping in metro cities",
      marquee: false,
      tone: "accent",
    }),
    block("nav-bar", {
      brand: "▲ VOLT",
      brandStyle: "mono",
      items: [
        { label: "Audio", href: "/products?category=audio" },
        { label: "Wearables", href: "/products?category=wearables" },
        { label: "Charging", href: "/products?category=charging" },
        { label: "Compare", href: "/products" },
      ],
      showSearch: true,
      showCart: true,
      showAccount: true,
      sticky: true,
      align: "between",
    }),
  ];
}
