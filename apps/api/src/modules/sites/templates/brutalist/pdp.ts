/**
 * Brutalist template — product detail page layout
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";
import { pdpColumns } from "../_shared/pdp";

export function brutalistPdp(): BlockNode[] {
  resetIdCounter();
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("thumbs-below", {
      buybox: {
        showSku: true,
        showCategory: false,
        variantDisplay: "dropdown",
      },
    }),
    block("pdp-details", { tabs: false }),
    block("pdp-related", { heading: "More", limit: 4, columns: 4 }),
  ];
}
