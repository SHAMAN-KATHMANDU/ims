/**
 * Shared offers layout — used by all templates.
 *
 * This layout is nearly identical across all templates (variation comes
 * from theme tokens, not block structure), so we share a single factory.
 */

import type { BlockNode } from "@repo/shared";
import { block } from "./factories";

export function offersLayout(): BlockNode[] {
  return [
    block("heading", {
      text: "Offers",
      level: 1,
      alignment: "center",
      eyebrow: "Limited time",
    }),
    block("product-grid", {
      source: "on-sale",
      columns: 4,
      limit: 24,
      cardVariant: "bordered",
    }),
  ];
}
