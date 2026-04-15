/**
 * Public (unauthenticated) cart-ping schema.
 *
 * The tenant-site CartProvider POSTs a snapshot of the current cart on
 * every mutation (debounced). The server upserts it into abandoned_carts
 * keyed by (tenantId, sessionKey). If the cart is empty the ping becomes
 * a delete — the guest cleared it, so nothing to remarket.
 *
 * sessionKey is a UUID the browser generates once and persists to
 * localStorage alongside the cart. It's not a secret — it's a stable
 * handle for the same cart across pings. No PII.
 *
 * Items mirror the CreateGuestOrder shape so the automation event can
 * consume either payload with the same condition rules.
 */

import { z } from "zod";

export const PingCartItemSchema = z.object({
  productId: z.string().uuid("Invalid product id"),
  productName: z.string().trim().min(1).max(300),
  unitPrice: z.number().nonnegative(),
  quantity: z.number().int().min(1).max(99),
  lineTotal: z.number().nonnegative(),
});

export const CartPingSchema = z.object({
  sessionKey: z
    .string()
    .trim()
    .min(8, "Session key too short")
    .max(64, "Session key too long"),
  items: z.array(PingCartItemSchema).max(50, "Cart is too large"),
  customerName: z.string().trim().max(200).optional().or(z.literal("")),
  customerPhone: z.string().trim().max(40).optional().or(z.literal("")),
  customerEmail: z.string().trim().max(200).optional().or(z.literal("")),
});

export type CartPingInput = z.infer<typeof CartPingSchema>;
export type PingCartItem = z.infer<typeof PingCartItemSchema>;
