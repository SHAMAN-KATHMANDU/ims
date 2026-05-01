/**
 * Organic template — product detail page layout
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";
import { pdpColumns } from "../_shared/pdp";

export function organicPdp(): BlockNode[] {
  resetIdCounter();
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("stacked", {
      buybox: { showSku: true, showCategory: true, showDescription: true },
    }),
    block("trust-strip", {
      items: [
        { label: "Naturally sourced", value: "100%" },
        { label: "Small batch", value: "Always" },
        { label: "Ethical", value: "Supply chain" },
      ],
    }),
    block("pdp-details", { tabs: false }),
    block("story-split", {
      eyebrow: "How it's made",
      title: "Made the slow way",
      body: "Each piece takes the time it takes — hours of hand-finishing, weeks of resting, months from source to shelf.",
      imageSide: "left",
    }),
    block("reviews-list", {
      heading: "Customer reviews",
      productIdSource: "current-pdp",
      pageSize: 5,
      showRatingSummary: true,
    }),
    block("fbt", {
      heading: "Pairs well with",
      productIdSource: "current-pdp",
      limit: 4,
      columns: 4,
      cardVariant: "bare",
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
