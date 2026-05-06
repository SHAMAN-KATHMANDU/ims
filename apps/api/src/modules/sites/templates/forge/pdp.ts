/**
 * Forge template — PDP. Includes a B2B price-tiers slot above the buybox.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";
import { pdpColumns } from "../_shared/pdp";

export function forgePdp(): BlockNode[] {
  resetIdCounter();
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("thumbs-left", {
      galleryAspect: "1/1",
      buybox: {
        showSku: true,
        showCategory: true,
        priceSize: "md",
        showDescription: true,
        variantDisplay: "dropdown",
      },
      priceTiersBefore: {
        tiers: [
          { minQty: 1, maxQty: 9, price: 0, label: "Single" },
          { minQty: 10, maxQty: 49, price: 0, label: "Pack" },
          { minQty: 50, maxQty: 199, price: 0, label: "Bulk" },
          { minQty: 200, price: 0, label: "Wholesale" },
        ],
        highlightActive: true,
        heading: "Volume pricing",
        footnote: "Wholesale tier requires a trade account.",
      },
    }),
    block("pdp-details", { tabs: true }),
    block("pdp-related", {
      heading: "Frequently ordered together",
      limit: 4,
      columns: 4,
    }),
  ];
}
