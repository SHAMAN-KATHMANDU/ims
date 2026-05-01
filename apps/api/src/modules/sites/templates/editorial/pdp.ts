/**
 * Editorial template — product detail page layout
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";
import { pdpColumns } from "../_shared/pdp";

export function editorialPdp(): BlockNode[] {
  resetIdCounter();
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("thumbs-left", {
      buybox: {
        showSku: true,
        showCategory: true,
        priceSize: "lg",
        showDescription: true,
        variantDisplay: "chips",
      },
    }),
    block("pdp-details", { tabs: true }),
    block("story-split", {
      eyebrow: "On this piece",
      title: "Chosen for a reason",
      body: "Every object we carry has been handled, assessed, and selected. Read the note behind why this one made it in.",
      imageSide: "right",
    }),
    block("reviews-list", {
      heading: "From the readers",
      productIdSource: "current-pdp",
      pageSize: 6,
      showRatingSummary: true,
      emptyMessage: "No reviews yet — be the first to weigh in.",
    }),
    block("pdp-related", {
      heading: "More from the collection",
      limit: 4,
      columns: 4,
    }),
  ];
}
