/**
 * Shared products-index layout — used by all templates.
 *
 * This layout is nearly identical across all templates (variation comes
 * from theme tokens, not block structure), so we share a single factory.
 */

import type { BlockNode } from "@repo/shared";
import { block } from "./factories";

export function productsIndexLayout(): BlockNode[] {
  return [
    block("heading", {
      text: "Shop",
      level: 1,
      alignment: "center",
      eyebrow: "All products",
    }),
    block("product-listing", {
      pageSize: 24,
      defaultSort: "newest",
      showSort: true,
      columns: 4,
      categoryFilter: true,
    }),
  ];
}
