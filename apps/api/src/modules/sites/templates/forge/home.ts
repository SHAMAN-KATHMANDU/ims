/**
 * Forge template — home layout
 *
 * Data-dense industrial. Dark steel, hazard-amber accent, tabular grids.
 * Niche: wholesale / B2B.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "../_shared/factories";

export function forgeHome(): BlockNode[] {
  resetIdCounter();
  return [
    block("hero", {
      variant: "minimal",
      heroLayout: "split-left",
      title: "Industrial supply, priced by the pallet.",
      subtitle:
        "12,000 SKUs across fastenings, fittings, and finished hardware. Tier pricing, bulk discounts, and 24-hour order processing.",
      ctaLabel: "Browse catalogue",
      ctaHref: "/products",
    }),
    block("stats-band", {
      items: [
        { value: "12,400", label: "SKUs in stock" },
        { value: "24h", label: "Order processing" },
        { value: "Net-30", label: "Trade terms" },
        { value: "98.2%", label: "Fill rate" },
      ],
      alignment: "start",
      valueSize: "lg",
    }),
    block("collection-cards", {
      heading: "Departments",
      cards: [
        {
          title: "Fasteners",
          subtitle: "3,840 SKUs",
          ctaHref: "/products?category=fasteners",
        },
        {
          title: "Fittings",
          subtitle: "1,260 SKUs",
          ctaHref: "/products?category=fittings",
        },
        {
          title: "Power tools",
          subtitle: "880 SKUs",
          ctaHref: "/products?category=tools",
        },
        {
          title: "Adhesives",
          subtitle: "412 SKUs",
          ctaHref: "/products?category=adhesives",
        },
      ],
      aspectRatio: "square",
    }),
    block("product-grid", {
      eyebrow: "Best moving",
      heading: "Top SKUs this quarter",
      source: "featured",
      limit: 8,
      columns: 4,
      cardVariant: "bordered",
      cardAspectRatio: "1/1",
      showPrice: true,
      showCategory: true,
    }),
    block("story-split", {
      eyebrow: "Tier pricing",
      title: "More volume, lower per-unit cost.",
      body: "Three tiers across every line — single, pack, and pallet. Tier pricing applies automatically at checkout. Trade members unlock a fourth wholesale tier.",
      imageSide: "right",
      ctaLabel: "Apply for trade",
      ctaHref: "/contact",
    }),
    block("policy-strip", {
      heading: "Why buyers buy from Forge",
      items: [
        { label: "24h dispatch", icon: "shipping", detail: "On in-stock SKUs" },
        { label: "Net-30 terms", icon: "secure", detail: "For approved trade" },
        { label: "Volume tiers", icon: "warranty", detail: "Auto-applied" },
        { label: "Account managers", icon: "support", detail: "Direct line" },
      ],
      layout: "grid",
      columns: 4,
      dark: true,
    }),
  ];
}
