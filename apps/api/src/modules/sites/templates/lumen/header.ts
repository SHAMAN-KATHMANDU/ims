/**
 * Lumen template — header layout
 *
 * Soft blush gradients, italic serif, generous whitespace. Niche: beauty / cosmetics.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function lumenHeader(): BlockNode[] {
  resetIdCounter();
  return [
    block("announcement-bar", {
      text: "Free samples with every order · Complimentary returns",
      marquee: false,
      tone: "muted",
    }),
    block("nav-bar", {
      brand: "Lumen",
      brandStyle: "serif",
      items: [
        { label: "Skincare", href: "/products?category=skincare" },
        { label: "Makeup", href: "/products?category=makeup" },
        { label: "Bath & body", href: "/products?category=bath" },
        { label: "Rituals", href: "/blog" },
      ],
      showSearch: true,
      showCart: true,
      showAccount: true,
      sticky: true,
      align: "center",
    }),
  ];
}
