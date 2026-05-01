/**
 * Gallery template — product detail page layout
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";
import { pdpColumns } from "../_shared/pdp";

export function galleryPdp(): BlockNode[] {
  resetIdCounter();
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("stacked", {
      galleryAspect: "4/5",
      buybox: {
        showSku: true,
        showCategory: true,
        priceSize: "md",
        showDescription: true,
      },
    }),
    block("pdp-details", { tabs: false }),
    block("bento-showcase", {
      eyebrow: "From the same artist",
      heading: "Related works",
      source: "featured",
      limit: 5,
    }),
    block("reviews-list", {
      heading: "Notes",
      productIdSource: "current-pdp",
      pageSize: 4,
      showRatingSummary: true,
      emptyMessage: "No public notes yet.",
    }),
    block("pdp-related", {
      heading: "Rest of the catalog",
      limit: 6,
      columns: 3,
    }),
  ];
}
