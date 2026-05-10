/**
 * Foxglove & Co. template — header layout
 *
 * Library-paper warmth, literary italic, indexed PLP, marginalia on PDP.
 * Niche: books / stationery.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function foxgloveHeader(): BlockNode[] {
  resetIdCounter();
  return [
    block("announcement-bar", {
      text: "Free wrapping on every order · Members read 10% off",
      marquee: false,
      tone: "muted",
    }),
    block("nav-bar", {
      variant: "standard",
      brand: "Foxglove & Co.",
      brandStyle: "serif",
      items: [
        { label: "Fiction", href: "/products?category=fiction" },
        { label: "Non-fiction", href: "/products?category=nonfiction" },
        { label: "Poetry", href: "/products?category=poetry" },
        { label: "Stationery", href: "/products?category=stationery" },
        { label: "The reading room", href: "/blog" },
      ],
      showSearch: true,
      showCart: true,
      showAccount: true,
      sticky: true,
      align: "between",
    }),
  ];
}
