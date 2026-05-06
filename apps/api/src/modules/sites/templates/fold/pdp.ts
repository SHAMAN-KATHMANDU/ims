/**
 * Fold template — PDP
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";
import { pdpColumns } from "../_shared/pdp";

export function foldPdp(): BlockNode[] {
  resetIdCounter();
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("stacked", {
      galleryAspect: "3/4",
      buybox: {
        showSku: true,
        showCategory: true,
        priceSize: "md",
        showDescription: true,
        variantDisplay: "chips",
      },
    }),
    block("pdp-details", { tabs: false }),
    block("size-guide", {
      triggerLabel: "Size guide",
      heading: "Size guide",
      columns: ["XS", "S", "M", "L", "XL"],
      rows: [
        { label: "Chest (cm)", values: ["86", "92", "98", "104", "110"] },
        { label: "Waist (cm)", values: ["72", "78", "84", "90", "96"] },
        { label: "Hip (cm)", values: ["88", "94", "100", "106", "112"] },
      ],
      variant: "modal",
    }),
    block("pdp-related", {
      heading: "Pairs with",
      limit: 4,
      columns: 4,
    }),
    block("reviews-list", {
      heading: "Reviews",
      productIdSource: "current-pdp",
      pageSize: 5,
      showRatingSummary: true,
    }),
  ];
}
