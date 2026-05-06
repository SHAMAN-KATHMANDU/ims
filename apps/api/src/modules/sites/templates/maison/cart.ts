/**
 * Maison template — cart
 */

import type { BlockNode } from "@repo/shared";
import { resetIdCounter } from "../_shared/factories";
import { cartLayout } from "../_shared/cart";

export function maisonCart(): BlockNode[] {
  resetIdCounter();
  return cartLayout({
    crossSell: true,
    summaryPosition: "right",
    heading: "Your bag.",
    checkoutLabel: "Proceed to checkout",
  });
}
