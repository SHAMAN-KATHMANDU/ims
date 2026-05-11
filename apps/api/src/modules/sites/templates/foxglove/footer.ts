/**
 * Foxglove & Co. template — footer layout
 *
 * Library-paper warmth, literary italic, indexed PLP, marginalia on PDP.
 * Niche: books / stationery.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function foxgloveFooter(): BlockNode[] {
  resetIdCounter();
  return [
    block("footer-columns", {
      variant: "standard",
      showBrand: true,
      brand: "Foxglove & Co.",
      tagline: "An independent bookshop. Quietly read since 2011.",
      columns: [
        {
          title: "Shop",
          links: [
            { label: "Fiction", href: "/products?category=fiction" },
            { label: "Non-fiction", href: "/products?category=nonfiction" },
            { label: "Poetry", href: "/products?category=poetry" },
            { label: "Stationery", href: "/products?category=stationery" },
          ],
        },
        {
          title: "Read",
          links: [
            { label: "The reading room", href: "/blog" },
            { label: "Bookseller's notes", href: "/blog" },
            { label: "Signed copies", href: "/products?tag=signed" },
          ],
        },
        {
          title: "Care",
          links: [
            { label: "Wrapping", href: "/about" },
            { label: "Returns", href: "/about" },
            { label: "Contact", href: "/contact" },
          ],
        },
      ],
    }),
  ];
}
