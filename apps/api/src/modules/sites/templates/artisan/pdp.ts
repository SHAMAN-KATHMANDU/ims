/**
 * Artisan template — product detail page layout
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";
import { pdpColumns } from "../_shared/pdp";

export function artisanPdp(): BlockNode[] {
  resetIdCounter();
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("thumbs-left", {
      buybox: {
        showSku: true,
        showCategory: true,
        showDescription: true,
        priceSize: "lg",
      },
    }),
    block("story-split", {
      eyebrow: "The maker",
      title: "Every piece is signed",
      body: "This was made by one of the artisans we've worked with for years. It carries their mark on the base — a small assurance that a real pair of hands finished it.",
      imageSide: "right",
    }),
    block("pdp-details", { tabs: true }),
    block("testimonials", {
      heading: "From our collectors",
      layout: "stacked",
      items: [
        {
          quote: "Four pieces over five years, each still in rotation.",
          author: "Priya S.",
          role: "Bangalore",
        },
        {
          quote: "The detail is extraordinary — photos don't do it justice.",
          author: "James W.",
          role: "Brooklyn",
        },
      ],
    }),
    block("reviews-list", {
      heading: "Customer reviews",
      productIdSource: "current-pdp",
      pageSize: 5,
      showRatingSummary: true,
    }),
    block("policy-strip", {
      layout: "inline",
      items: [
        {
          label: "Handmade",
          detail: "Signed by the maker",
          icon: "warranty",
        },
        { label: "Gift-ready", detail: "Complimentary wrap", icon: "gift" },
        {
          label: "Lifetime care",
          detail: "Repairs at cost",
          icon: "support",
        },
      ],
    }),
    block("pdp-related", {
      heading: "From the same maker",
      limit: 4,
      columns: 4,
    }),
  ];
}
