/**
 * Brutalist template — home layout
 */

import type { BlockNode } from "@repo/shared";
import { block } from "../_shared/factories";

export function brutalistHome(): BlockNode[] {
  // Minimal type-driven — big headline, product grid, that's it.
  return [
    block("hero", {
      variant: "minimal",
      title: "No frills. Just product.",
      ctaLabel: "Browse",
      ctaHref: "/products",
    }),
    block("product-grid", {
      heading: "Products",
      source: "featured",
      limit: 12,
      columns: 4,
      cardVariant: "bare",
    }),
    block("stats-band", {
      items: [
        { value: "12", label: "Years making" },
        { value: "3", label: "People" },
        { value: "1", label: "Shop" },
        { value: "0", label: "Bullshit" },
      ],
    }),
    block("story-split", {
      title: "No frills",
      body: "We make things. You buy them. That's the arrangement.",
      imageSide: "right",
    }),
    block("blog-list", { heading: "From the journal", limit: 3, columns: 3 }),
    block("newsletter", {
      title: "Updates",
      subtitle: "Infrequent, relevant.",
      cta: "OK",
    }),
  ];
}
