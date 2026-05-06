/**
 * Ridge template — PDP. Performance specs, oversized CTA.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";
import { pdpColumns } from "../_shared/pdp";

export function ridgePdp(): BlockNode[] {
  resetIdCounter();
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("thumbs-left", {
      galleryAspect: "3/4",
      buybox: {
        showSku: true,
        showCategory: true,
        priceSize: "lg",
        showDescription: true,
        variantDisplay: "chips",
      },
    }),
    block("pdp-details", { tabs: true }),
    block("size-guide", {
      triggerLabel: "Size & fit",
      heading: "Size & fit",
      columns: ["XS", "S", "M", "L", "XL"],
      rows: [
        { label: "Chest (cm)", values: ["86", "92", "98", "104", "110"] },
        { label: "Waist (cm)", values: ["72", "78", "84", "90", "96"] },
      ],
      variant: "modal",
    }),
    block("reviews-list", {
      heading: "Athlete reviews",
      productIdSource: "current-pdp",
      pageSize: 6,
      showRatingSummary: true,
    }),
    block("pdp-related", {
      heading: "Train with",
      limit: 4,
      columns: 4,
    }),
  ];
}
