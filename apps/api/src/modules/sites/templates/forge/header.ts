/**
 * Forge template — header layout
 *
 * Data-dense industrial. Dark steel, hazard-amber accent, tabular grids.
 * Niche: wholesale / B2B.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function forgeHeader(): BlockNode[] {
  resetIdCounter();
  return [
    block("account-bar", {
      showAccountNumber: true,
      showTier: true,
      showPo: true,
      alignment: "between",
      tone: "default",
      guestText: "Sign in for wholesale pricing",
    }),
    block("announcement-bar", {
      text: "Net-30 terms · Bulk discounts · 24h order processing",
      marquee: false,
      tone: "default",
    }),
    block("nav-bar", {
      brand: "FORGE / B2B",
      brandStyle: "mono",
      items: [
        { label: "Catalogue", href: "/products" },
        { label: "Quick order", href: "/products" },
        { label: "Tier pricing", href: "/about" },
        { label: "Account", href: "/contact" },
      ],
      showSearch: true,
      showCart: true,
      showAccount: true,
      sticky: true,
      align: "between",
    }),
  ];
}
