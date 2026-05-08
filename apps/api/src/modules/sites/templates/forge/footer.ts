/**
 * Forge template — footer layout
 *
 * Data-dense industrial. Dark steel, hazard-amber accent, tabular grids.
 * Niche: wholesale / B2B.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function forgeFooter(): BlockNode[] {
  resetIdCounter();
  return [
    block("footer-columns", {
      showBrand: true,
      brand: "FORGE / B2B",
      tagline:
        "Industrial supply, priced by the pallet. Distribution since 2002.",
      columns: [
        {
          title: "Catalogue",
          links: [
            { label: "Fasteners", href: "/products?category=fasteners" },
            { label: "Fittings", href: "/products?category=fittings" },
            { label: "Power tools", href: "/products?category=tools" },
            { label: "Adhesives", href: "/products?category=adhesives" },
          ],
        },
        {
          title: "Trade",
          links: [
            { label: "Tier pricing", href: "/about" },
            { label: "Account managers", href: "/contact" },
            { label: "Net-30 terms", href: "/about" },
          ],
        },
        {
          title: "Support",
          links: [
            { label: "Returns", href: "/about" },
            { label: "Spec sheets", href: "/blog" },
            { label: "Contact", href: "/contact" },
          ],
        },
      ],
    }),
  ];
}
