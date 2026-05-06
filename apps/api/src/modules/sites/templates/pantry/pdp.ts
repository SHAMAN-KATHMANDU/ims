/**
 * Pantry template — PDP. Recipe-style, ingredient-rich detail.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";
import { pdpColumns } from "../_shared/pdp";

export function pantryPdp(): BlockNode[] {
  resetIdCounter();
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("thumbs-below", {
      galleryAspect: "1/1",
      buybox: {
        showSku: false,
        showCategory: true,
        priceSize: "md",
        showDescription: true,
        variantDisplay: "chips",
      },
    }),
    block("pdp-details", { tabs: true }),
    block("story-split", {
      eyebrow: "From the producer",
      title: "Pressed within 24h of harvest.",
      body: "We work directly with the cooperative; every label we sell carries the harvest date and the press date on the back.",
      imageSide: "right",
    }),
    block("reviews-list", {
      heading: "What buyers cooked with it",
      productIdSource: "current-pdp",
      pageSize: 5,
      showRatingSummary: true,
    }),
    block("pdp-related", {
      heading: "Pantry pairings",
      limit: 4,
      columns: 4,
    }),
  ];
}
