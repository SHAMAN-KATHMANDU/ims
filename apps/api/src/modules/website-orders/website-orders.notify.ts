/**
 * In-app notification helper for guest orders.
 *
 * When a guest places an order via /public/orders the tenant's admins
 * need to know immediately — otherwise the first hint is when someone
 * refreshes the Website Orders list view. This helper fans out to every
 * admin/superAdmin user in the tenant and creates a Notification row,
 * which the existing top-bar bell already polls via
 * GET /notifications/unread-count.
 *
 * Fire-and-forget posture, matching revalidateTenantSite:
 *   - caller awaits this so ordering is predictable in tests,
 *   - but the caller can safely ignore the promise in production — any
 *     error is logged, never rethrown. The guest-order POST must not
 *     500 just because the notifications table is slow.
 *
 * Email alerts are a separate follow-up: the codebase has no mailer
 * today (no nodemailer / SES / Resend wiring), and picking a provider
 * is an ops decision that belongs in its own PR.
 */

import { basePrisma } from "@/config/prisma";
import { logger } from "@/config/logger";
import notificationRepository from "@/modules/notifications/notification.repository";
import type { WebsiteOrder } from "@prisma/client";

interface OrderSummary {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  subtotal: string;
  currency: string;
}

function summarize(order: WebsiteOrder): OrderSummary {
  return {
    id: order.id,
    orderCode: order.orderCode,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    subtotal: order.subtotal.toString(),
    currency: order.currency,
  };
}

function itemCount(items: unknown): number {
  return Array.isArray(items) ? items.length : 0;
}

/**
 * Find every admin + superAdmin user in this tenant. `basePrisma` is
 * the cross-tenant client — we explicitly filter by tenantId because
 * the guest order flow runs without an AsyncLocalStorage tenant
 * context (it's unauthenticated and was just creating the row via
 * the same public path).
 */
async function findTenantAdmins(tenantId: string): Promise<string[]> {
  const users = await basePrisma.user.findMany({
    where: {
      tenantId,
      role: { in: ["admin", "superAdmin"] },
    },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

/**
 * Fan out a WEBSITE_ORDER_NEW notification to every tenant admin.
 * Individual inserts so one bad row doesn't fail the whole batch.
 */
export async function notifyNewOrder(
  tenantId: string,
  order: WebsiteOrder,
): Promise<void> {
  try {
    const summary = summarize(order);
    const count = itemCount(order.items);
    const title = `New order ${summary.orderCode}`;
    const message = `${summary.customerName} · ${count} item${
      count === 1 ? "" : "s"
    } · ${summary.currency} ${summary.subtotal}`;

    const adminIds = await findTenantAdmins(tenantId);
    if (adminIds.length === 0) {
      logger.warn("notifyNewOrder: no admins to notify", undefined, {
        tenantId,
        orderCode: summary.orderCode,
      });
      return;
    }

    for (const userId of adminIds) {
      try {
        await notificationRepository.create({
          userId,
          type: "WEBSITE_ORDER_NEW",
          title,
          message,
          resourceType: "website_order",
          resourceId: summary.id,
        });
      } catch (err) {
        logger.warn("notifyNewOrder: per-user insert failed", undefined, {
          tenantId,
          userId,
          orderCode: summary.orderCode,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
  } catch (err) {
    logger.warn("notifyNewOrder threw", undefined, {
      tenantId,
      orderId: order.id,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
