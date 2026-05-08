/**
 * Ridge// template — header layout
 *
 * High-contrast performance. Italic mono numerals, oversized CTAs, tactical
 * orange. Niche: sports / fitness.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function ridgeHeader(): BlockNode[] {
  resetIdCounter();
  return [
    block("announcement-bar", {
      text: "Train hard. Free returns within 30 days.",
      marquee: true,
      tone: "default",
      items: [
        "Train hard. Returns 30 days.",
        "Free shipping over ₹3,500",
        "Drop 12 — live now",
      ],
    }),
    block("nav-bar", {
      brand: "RIDGE//",
      brandStyle: "sans",
      items: [
        { label: "Run", href: "/products?category=run" },
        { label: "Train", href: "/products?category=train" },
        { label: "Outdoor", href: "/products?category=outdoor" },
        { label: "Drops", href: "/offers" },
      ],
      showSearch: true,
      showCart: true,
      showAccount: true,
      sticky: true,
      align: "between",
    }),
  ];
}
