/**
 * Retro template — product detail page layout
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";
import { pdpColumns } from "../_shared/pdp";

export function retroPdp(): BlockNode[] {
  resetIdCounter();
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("thumbs-below", {
      buybox: { showSku: true, showCategory: true, priceSize: "lg" },
    }),
    block("stats-band", {
      items: [
        { value: "40 yrs", label: "Running" },
        { value: "1k+", label: "Products" },
        { value: "100%", label: "Ours" },
      ],
    }),
    block("pdp-details", { tabs: true }),
    block("reviews-list", {
      heading: "What the regulars say",
      productIdSource: "current-pdp",
      pageSize: 5,
      showRatingSummary: true,
    }),
    block("fbt", {
      heading: "Grab these too",
      productIdSource: "current-pdp",
      limit: 4,
      columns: 4,
      cardVariant: "card",
    }),
    block("pdp-related", {
      heading: "More classics",
      limit: 4,
      columns: 4,
    }),
    block("bento-showcase", {
      heading: "This month's picks",
      source: "featured",
      limit: 5,
    }),
  ];
}
