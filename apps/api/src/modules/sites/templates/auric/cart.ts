import type { BlockNode } from "@repo/shared";
import { resetIdCounter } from "../_shared/factories";
import { cartLayout } from "../_shared/cart";

export function auricCart(): BlockNode[] {
  resetIdCounter();
  return cartLayout({
    crossSell: false,
    summaryPosition: "right",
    heading: "Your selection",
    checkoutLabel: "Proceed to checkout",
  });
}
