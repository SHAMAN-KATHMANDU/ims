/**
 * Auric template — PDP. Hairline-rule rich product detail.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";
import { pdpColumns } from "../_shared/pdp";

export function auricPdp(): BlockNode[] {
  resetIdCounter();
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("thumbs-below", {
      galleryAspect: "1/1",
      buybox: {
        showSku: false,
        showCategory: true,
        priceSize: "lg",
        showDescription: true,
        variantDisplay: "chips",
      },
    }),
    block("pdp-details", { tabs: false }),
    block("story-split", {
      eyebrow: "On this piece",
      title: "Bench-finished, one at a time.",
      body: "Every Auric piece is hand-finished at our Jaipur atelier. Each carries the maker's mark on the inner band.",
      imageSide: "right",
    }),
    block("reviews-list", {
      heading: "From the wearer",
      productIdSource: "current-pdp",
      pageSize: 4,
      showRatingSummary: true,
    }),
    block("pdp-related", {
      heading: "From the same hand",
      limit: 3,
      columns: 3,
    }),
  ];
}
