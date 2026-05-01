/**
 * Zen template — home layout
 */

import type { BlockNode } from "@repo/shared";
import { block } from "../_shared/factories";

export function zenHome(): BlockNode[] {
  return [
    block("hero", {
      variant: "minimal",
      title: "Less, but better",
      subtitle: "Carefully chosen objects for a considered life",
      ctaLabel: "Begin",
      ctaHref: "/products",
    }),
    block("story-split", {
      eyebrow: "Philosophy",
      title: "Less, but better",
      body: "The objects around you shape the way you move through a day. We choose ours carefully.",
      imageSide: "left",
    }),
    block("product-grid", {
      eyebrow: "Selection",
      heading: "A few things",
      source: "featured",
      limit: 6,
      columns: 3,
      cardVariant: "bare",
    }),
    block("trust-strip", {
      items: [
        { label: "Shipping", value: "Worldwide, carbon-offset" },
        { label: "Returns", value: "Thirty days, no questions" },
        { label: "Questions", value: "Replies within a day" },
      ],
    }),
    block("stats-band", {
      items: [
        { value: "7", label: "Categories" },
        { value: "48", label: "Items" },
        { value: "1", label: "Focus" },
      ],
    }),
    block("blog-list", { heading: "From the journal", limit: 3, columns: 3 }),
    block("newsletter", {
      title: "Occasional notes",
      subtitle: "Once a season.",
      cta: "Subscribe",
    }),
  ];
}
