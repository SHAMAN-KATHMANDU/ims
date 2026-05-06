/**
 * Verdant template — PDP. Care-guide accordion-style detail.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";
import { pdpColumns } from "../_shared/pdp";

export function verdantPdp(): BlockNode[] {
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
    block("accordion", {
      heading: "Care guide",
      items: [
        {
          title: "Light",
          body: "Bright, indirect light. Tolerates 1–2 hours of soft direct sun.",
        },
        {
          title: "Water",
          body: "Top inch of soil dry to the touch. Less in winter.",
        },
        { title: "Soil", body: "Standard houseplant mix with 30% perlite." },
        {
          title: "Repotting",
          body: "Every 18–24 months, into a pot one size larger.",
        },
      ],
      variant: "minimal",
    }),
    block("reviews-list", {
      heading: "From other growers",
      productIdSource: "current-pdp",
      pageSize: 5,
      showRatingSummary: true,
    }),
    block("pdp-related", {
      heading: "Pairs well in the same room",
      limit: 3,
      columns: 3,
    }),
  ];
}
