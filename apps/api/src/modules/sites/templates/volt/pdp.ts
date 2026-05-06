/**
 * Volt template — PDP. Comparison-table style spec section.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";
import { pdpColumns } from "../_shared/pdp";

export function voltPdp(): BlockNode[] {
  resetIdCounter();
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("thumbs-below", {
      galleryAspect: "1/1",
      buybox: {
        showSku: true,
        showCategory: true,
        priceSize: "lg",
        showDescription: true,
        variantDisplay: "chips",
      },
    }),
    block("pdp-details", { tabs: true }),
    block("reviews-list", {
      heading: "User reviews",
      productIdSource: "current-pdp",
      pageSize: 5,
      showRatingSummary: true,
    }),
    block("pdp-related", {
      heading: "Engineered alongside",
      limit: 4,
      columns: 4,
    }),
  ];
}
