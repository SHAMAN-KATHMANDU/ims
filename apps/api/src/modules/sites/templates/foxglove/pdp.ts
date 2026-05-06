/**
 * Foxglove template — PDP. Marginalia rich-text aside, library-paper.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";
import { pdpColumns } from "../_shared/pdp";

export function foxglovePdp(): BlockNode[] {
  resetIdCounter();
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("thumbs-below", {
      galleryAspect: "3/4",
      buybox: {
        showSku: false,
        showCategory: true,
        priceSize: "md",
        showDescription: true,
        variantDisplay: "chips",
      },
    }),
    block("rich-text", {
      source:
        "_From the bookseller —_\n\nOne of the quietest novels of the year, but it has a backbone. Begin with chapter three; the first two are scaffolding.",
      maxWidth: "narrow",
      alignment: "start",
    }),
    block("pdp-details", { tabs: true }),
    block("reviews-list", {
      heading: "Readers' margins",
      productIdSource: "current-pdp",
      pageSize: 5,
      showRatingSummary: true,
    }),
    block("pdp-related", {
      heading: "Shelved nearby",
      limit: 4,
      columns: 4,
    }),
  ];
}
