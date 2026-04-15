/**
 * Abandoned-cart sweep service.
 *
 * Finds AbandonedCart rows that have been idle long enough to count as
 * "abandoned" and publishes a `cart.abandoned` automation event for each.
 *
 * Definition of "abandoned":
 *   - lastActivityAt older than IDLE_THRESHOLD_MS (30 min)
 *   - notifiedAt IS NULL (we haven't already fired for this instance)
 *   - items array is non-empty (an empty cart would have been deleted
 *     by the ping upsert, but we defensively double-check)
 *
 * After publishing the event we stamp notifiedAt so the sweep doesn't
 * re-fire the same cart on every tick. The ping upsert resets notifiedAt
 * to NULL whenever the user touches the cart again, so repeat abandoners
 * still get caught.
 *
 * Cross-tenant: this runs from the scheduler without a tenant context,
 * so we use `basePrisma` and pass tenantId explicitly to
 * `publishDomainEvent`. The automation runtime handles per-tenant fanout.
 *
 * Purge side effect: we also delete rows older than PURGE_AFTER_MS (7
 * days). Without this the table would grow forever since the browser
 * can walk away from its sessionKey and we'd never see a clear ping.
 */

import { basePrisma } from "@/config/prisma";
import { logger } from "@/config/logger";
import automationService from "@/modules/automation/automation.service";

const IDLE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const PURGE_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SWEEP_BATCH_LIMIT = 100;

interface SweepResult {
  found: number;
  fired: number;
  purged: number;
}

function itemCount(items: unknown): number {
  return Array.isArray(items) ? items.length : 0;
}

export async function sweepAbandonedCarts(): Promise<SweepResult> {
  const now = Date.now();
  const idleCutoff = new Date(now - IDLE_THRESHOLD_MS);
  const purgeCutoff = new Date(now - PURGE_AFTER_MS);

  const stale = await basePrisma.abandonedCart.findMany({
    where: {
      notifiedAt: null,
      lastActivityAt: { lt: idleCutoff },
    },
    take: SWEEP_BATCH_LIMIT,
    orderBy: { lastActivityAt: "asc" },
  });

  let fired = 0;
  for (const cart of stale) {
    const count = itemCount(cart.items);
    if (count === 0) {
      // Defensive: empty carts shouldn't sit here (the ping path
      // deletes them) but if one slips through, drop it instead of
      // firing a useless event.
      await basePrisma.abandonedCart
        .delete({ where: { id: cart.id } })
        .catch(() => undefined);
      continue;
    }

    try {
      await automationService.publishDomainEvent({
        tenantId: cart.tenantId,
        eventName: "cart.abandoned",
        scopeType: "GLOBAL",
        scopeId: null,
        entityType: "ABANDONED_CART",
        entityId: cart.id,
        actorUserId: null,
        dedupeKey: `cart-abandoned:${cart.id}:${cart.lastActivityAt.toISOString()}`,
        payload: {
          cartId: cart.id,
          sessionKey: cart.sessionKey,
          items: cart.items,
          subtotal: cart.subtotal.toString(),
          currency: cart.currency,
          customerName: cart.customerName,
          customerPhone: cart.customerPhone,
          customerEmail: cart.customerEmail,
          lastActivityAt: cart.lastActivityAt.toISOString(),
          itemCount: count,
        },
      });

      await basePrisma.abandonedCart.update({
        where: { id: cart.id },
        data: { notifiedAt: new Date() },
      });
      fired += 1;
    } catch (err) {
      logger.warn("sweepAbandonedCarts: publish failed for cart", undefined, {
        cartId: cart.id,
        tenantId: cart.tenantId,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const { count: purged } = await basePrisma.abandonedCart.deleteMany({
    where: { lastActivityAt: { lt: purgeCutoff } },
  });

  return { found: stale.length, fired, purged };
}

export default {
  sweepAbandonedCarts,
};
