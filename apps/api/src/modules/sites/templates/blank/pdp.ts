/**
 * Blank template — product detail page layout
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";
import { pdpColumns } from "../_shared/pdp";

export function blankPdp(): BlockNode[] {
  resetIdCounter();
  // New-tenant default PDP. Matches the home blueprint's "showcase every
  // strong block" philosophy — tenants can delete reviews/fbt/recently
  // if not relevant, but they see the full toolkit out of the box.
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("thumbs-below", {
      buybox: {
        showSku: true,
        showCategory: true,
        showDescription: true,
        priceSize: "lg",
      },
    }),
    block("pdp-details", { tabs: true }),
    block("trust-strip", {
      items: [
        { label: "Free shipping", value: "Over ₹2,000" },
        { label: "30-day returns", value: "No questions" },
        { label: "Secure payment", value: "SSL" },
      ],
    }),
    block("reviews-list", {
      heading: "Customer reviews",
      productIdSource: "current-pdp",
      pageSize: 5,
      showRatingSummary: true,
      emptyMessage: "Be the first to review this product.",
    }),
    block("fbt", {
      heading: "Frequently bought together",
      productIdSource: "current-pdp",
      limit: 4,
      columns: 4,
      cardVariant: "bordered",
    }),
    block("pdp-related", {
      heading: "You may also like",
      limit: 4,
      columns: 4,
    }),
    block("recently-viewed", {
      heading: "Recently viewed",
      limit: 4,
      columns: 4,
      cardVariant: "bare",
      hideWhenEmpty: true,
      excludeCurrent: true,
    }),
  ];
}
