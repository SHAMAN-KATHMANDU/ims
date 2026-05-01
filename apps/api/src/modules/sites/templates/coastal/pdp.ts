/**
 * Coastal template — product detail page layout
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";
import { pdpColumns } from "../_shared/pdp";

export function coastalPdp(): BlockNode[] {
  resetIdCounter();
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("thumbs-below", { galleryAspect: "4/5" }),
    block("pdp-details", { tabs: false }),
    block("policy-strip", {
      layout: "grid",
      columns: 4,
      items: [
        {
          label: "Free shipping",
          detail: "Orders over ₹3,000",
          icon: "shipping",
        },
        { label: "Easy returns", detail: "30-day window", icon: "returns" },
        {
          label: "Secure payment",
          detail: "Encrypted checkout",
          icon: "secure",
        },
        { label: "We're here", detail: "Mon–Sat support", icon: "support" },
      ],
    }),
    block("reviews-list", {
      heading: "What buyers say",
      productIdSource: "current-pdp",
      pageSize: 5,
      showRatingSummary: true,
    }),
    block("fbt", {
      heading: "Style it with",
      productIdSource: "current-pdp",
      limit: 4,
      columns: 4,
      cardVariant: "bordered",
    }),
    block("recently-viewed", {
      heading: "Recently viewed",
      limit: 4,
      columns: 4,
      cardVariant: "bordered",
      hideWhenEmpty: true,
      excludeCurrent: true,
    }),
  ];
}
