/**
 * Zen template — product detail page layout
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";
import { pdpColumns } from "../_shared/pdp";

export function zenPdp(): BlockNode[] {
  resetIdCounter();
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("thumbs-below", {
      buybox: {
        showSku: false,
        showCategory: true,
        priceSize: "md",
        showDescription: true,
      },
    }),
    block("pdp-details", { tabs: false }),
    block("reviews-list", {
      heading: "Notes from others",
      productIdSource: "current-pdp",
      pageSize: 4,
      showRatingSummary: true,
    }),
    block("recently-viewed", {
      heading: "Recently considered",
      limit: 3,
      columns: 3,
      cardVariant: "bare",
      hideWhenEmpty: true,
      excludeCurrent: true,
    }),
  ];
}
