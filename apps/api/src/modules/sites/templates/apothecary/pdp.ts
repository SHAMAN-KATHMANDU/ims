/**
 * Apothecary template — product detail page layout
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";
import { pdpColumns } from "../_shared/pdp";

export function apothecaryPdp(): BlockNode[] {
  resetIdCounter();
  return [
    block("breadcrumbs", { scope: "product" }),
    pdpColumns("thumbs-left", {
      buybox: {
        showSku: true,
        showCategory: true,
        showDescription: true,
      },
    }),
    block("trust-strip", {
      columns: 4,
      items: [
        { label: "Botanical", value: "Sourced" },
        { label: "Small batch", value: "Handmade" },
        { label: "Third-party", value: "Tested" },
        { label: "Cruelty", value: "Free" },
      ],
    }),
    block("pdp-details", { tabs: true }),
    block("faq", {
      heading: "Questions about this formula",
      variant: "bordered",
      items: [
        {
          question: "How should I store it?",
          answer:
            "Cool, dry, away from direct sun. Most products keep 12 months after opening.",
        },
        {
          question: "Is it tested on animals?",
          answer:
            "Never. Every formula is cruelty-free and third-party verified.",
        },
        {
          question: "Suitable for sensitive skin?",
          answer:
            "Most formulas are — the label calls out common allergens when they're present.",
        },
      ],
    }),
    block("reviews-list", {
      heading: "Reviews",
      productIdSource: "current-pdp",
      pageSize: 5,
      showRatingSummary: true,
    }),
    block("fbt", {
      heading: "Often paired with",
      productIdSource: "current-pdp",
      limit: 4,
      columns: 4,
      cardVariant: "card",
    }),
    block("policy-strip", {
      layout: "inline",
      items: [
        { label: "Free shipping", detail: "Over ₹2,000", icon: "shipping" },
        { label: "30-day returns", detail: "Unopened", icon: "returns" },
        { label: "Secure payment", detail: "SSL", icon: "secure" },
      ],
    }),
  ];
}
