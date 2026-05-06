/**
 * Maison template — PDP
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";
import { pdpColumns } from "../_shared/pdp";

export function maisonPdp(): BlockNode[] {
  resetIdCounter();
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("thumbs-left", {
      galleryAspect: "4/5",
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
      body: "Every object in our catalogue has been handled, weighed, sat on, and considered. Read the maker's note behind why this one made the cut.",
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
