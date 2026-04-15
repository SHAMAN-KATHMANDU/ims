/**
 * Public cart-ping service — upserts an AbandonedCart row for a
 * (tenantId, sessionKey) pair. Called from the unauthenticated
 * /public/cart-pings controller.
 *
 * Uses `basePrisma` because this flow runs without an AsyncLocalStorage
 * tenant context (like website-orders.notify and public-orders). The
 * tenantId comes from the Host-header resolver.
 *
 * Two-way behaviour:
 *   - Non-empty cart → upsert with latest items + reset notifiedAt.
 *     Resetting notifiedAt means a user who bails, comes back, and edits
 *     the cart is treated as a fresh shopper; the next sweep can re-fire
 *     `cart.abandoned` if they drop off again.
 *   - Empty cart → delete. Someone cleared the cart themselves, there's
 *     nothing to remarket. No-op if the row doesn't exist.
 */

import type { Prisma } from "@prisma/client";
import { basePrisma } from "@/config/prisma";
import type { PingCartItem } from "./public-cart-pings.schema";

interface CartPingPayload {
  sessionKey: string;
  items: PingCartItem[];
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
}

function computeSubtotal(items: PingCartItem[]): number {
  return items.reduce((sum, i) => sum + i.lineTotal, 0);
}

function normalizeContactField(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

async function recordCartPing(
  tenantId: string,
  payload: CartPingPayload,
): Promise<void> {
  if (payload.items.length === 0) {
    // Empty cart → drop any existing row. deleteMany is forgiving if
    // the row doesn't exist (no throw).
    await basePrisma.abandonedCart.deleteMany({
      where: { tenantId, sessionKey: payload.sessionKey },
    });
    return;
  }

  const subtotal = computeSubtotal(payload.items);
  const now = new Date();
  const itemsJson = payload.items as unknown as Prisma.InputJsonValue;

  await basePrisma.abandonedCart.upsert({
    where: {
      tenantId_sessionKey: {
        tenantId,
        sessionKey: payload.sessionKey,
      },
    },
    create: {
      tenantId,
      sessionKey: payload.sessionKey,
      items: itemsJson,
      subtotal,
      customerName: normalizeContactField(payload.customerName),
      customerPhone: normalizeContactField(payload.customerPhone),
      customerEmail: normalizeContactField(payload.customerEmail),
      lastActivityAt: now,
      notifiedAt: null,
    },
    update: {
      items: itemsJson,
      subtotal,
      customerName: normalizeContactField(payload.customerName),
      customerPhone: normalizeContactField(payload.customerPhone),
      customerEmail: normalizeContactField(payload.customerEmail),
      lastActivityAt: now,
      // Resetting notifiedAt on every activity ping means repeat
      // abandoners get re-triggered. See header comment.
      notifiedAt: null,
    },
  });
}

export default {
  recordCartPing,
  computeSubtotal,
};
