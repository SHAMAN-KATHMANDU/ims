/**
 * Dark template — product detail page layout
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";
import { pdpColumns } from "../_shared/pdp";

export function darkPdp(): BlockNode[] {
  resetIdCounter();
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("thumbs-below", {
      buybox: {
        showSku: true,
        showCategory: true,
        priceSize: "lg",
        variantDisplay: "chips",
      },
      stickyFirst: true,
    }),
    block("stats-band", {
      dark: true,
      alignment: "center",
      valueSize: "lg",
      items: [
        { value: "24h", label: "Dispatch" },
        { value: "Limited", label: "Run" },
        { value: "∞", label: "Replays" },
      ],
    }),
    block("pdp-details", { tabs: true }),
    block("fbt", {
      heading: "Completes the fit",
      productIdSource: "current-pdp",
      limit: 4,
      columns: 4,
      cardVariant: "card",
    }),
    block("bento-showcase", {
      eyebrow: "This month",
      heading: "Other drops",
      source: "featured",
      limit: 5,
    }),
    block("reviews-list", {
      heading: "Reviews",
      productIdSource: "current-pdp",
      pageSize: 5,
      showRatingSummary: true,
    }),
  ];
}
