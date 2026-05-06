import type { BlockNode } from "@repo/shared";
import { resetIdCounter } from "../_shared/factories";
import { cartLayout } from "../_shared/cart";

export function ridgeCart(): BlockNode[] {
  resetIdCounter();
  return cartLayout({
    crossSell: true,
    summaryPosition: "right",
    heading: "Gear up",
    checkoutLabel: "Checkout",
  });
}
