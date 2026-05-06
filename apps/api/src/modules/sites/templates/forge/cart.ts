/**
 * Forge template — cart. Includes B2B account-bar above heading.
 */

import type { BlockNode } from "@repo/shared";
import { resetIdCounter } from "../_shared/factories";
import { cartLayout } from "../_shared/cart";

export function forgeCart(): BlockNode[] {
  resetIdCounter();
  return cartLayout({
    crossSell: true,
    summaryPosition: "right",
    heading: "Order draft",
    checkoutLabel: "Submit order",
    accountBar: true,
  });
}
