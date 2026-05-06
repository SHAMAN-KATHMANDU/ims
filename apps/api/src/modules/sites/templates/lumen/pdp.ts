/**
 * Lumen template — PDP
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";
import { pdpColumns } from "../_shared/pdp";

export function lumenPdp(): BlockNode[] {
  resetIdCounter();
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("stacked", {
      galleryAspect: "4/5",
      buybox: {
        showSku: false,
        showCategory: true,
        priceSize: "lg",
        showDescription: true,
        variantDisplay: "chips",
      },
    }),
    block("pdp-details", { tabs: true }),
    block("reviews-list", {
      heading: "What people are saying",
      productIdSource: "current-pdp",
      pageSize: 6,
      showRatingSummary: true,
    }),
    block("pdp-related", {
      heading: "Pair with",
      limit: 3,
      columns: 3,
    }),
  ];
}
