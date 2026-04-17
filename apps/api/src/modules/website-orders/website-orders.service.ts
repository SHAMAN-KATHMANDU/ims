/**
 * WebsiteOrder service — tenant-admin side of the guest-cart flow.
 *
 * State machine:
 *
 *    PENDING_VERIFICATION  →  VERIFIED      (admin called the customer, order is real)
 *    PENDING_VERIFICATION  →  REJECTED      (spam / fake / cancelled by customer)
 *    VERIFIED              →  CONVERTED_TO_SALE  (admin picked a location + payments)
 *
 * The only terminal state is CONVERTED_TO_SALE, which freezes the order
 * and links it to a real Sale row. Rejection is reversible via delete +
 * re-create; we don't allow un-rejecting in place because that path is a
 * footgun (admin accidentally rejects, un-rejects, then the cart already
 * expired from the buyer's end).
 *
 * Conversion walks each item in the order's JSON snapshot, picks an
 * active product variation, builds a SaleItemInput, and calls the
 * existing `createSale` service — which handles inventory decrement,
 * member upsert, audit logging, workflow runs. No custom sale-creation
 * path here.
 */

import { Prisma, type WebsiteOrder } from "@prisma/client";
import { createError } from "@/middlewares/errorHandler";
import { createSale, type SaleItemInput } from "@/modules/sales/sale.service";
import transferService from "@/modules/transfers/transfer.service";
import prisma from "@/config/prisma";
import sitesRepo from "@/modules/sites/sites.repository";
import defaultRepo, {
  type WebsiteOrderListItem,
} from "./website-orders.repository";
import type {
  ConvertOrderInput,
  ListWebsiteOrdersQuery,
  RejectOrderInput,
} from "./website-orders.schema";

type Repo = typeof defaultRepo;
type SitesRepo = typeof sitesRepo;

export interface CartItemSnapshot {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  /**
   * Customer-selected variation at checkout time. Null on legacy orders
   * (and products with a single active variation — the public-orders
   * schema leaves it null and the conversion falls back to the first
   * active variation).
   */
  variationId?: string | null;
  subVariationId?: string | null;
  variationLabel?: string | null;
}

export interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  customerNote?: string | null;
  items: CartItemSnapshot[];
  sourceIp?: string | null;
  sourceUserAgent?: string | null;
}

function pad4(n: number): string {
  return n.toString().padStart(4, "0");
}

export class WebsiteOrdersService {
  constructor(
    private readonly repo: Repo = defaultRepo,
    private readonly sites: SitesRepo = sitesRepo,
  ) {}

  private async assertEnabled(tenantId: string): Promise<void> {
    const site = await this.sites.findConfig(tenantId);
    if (!site) {
      throw createError(
        "Website feature is not enabled for this tenant. Contact your platform administrator.",
        403,
      );
    }
    if (!site.websiteEnabled) {
      throw createError(
        "Website feature is disabled for this tenant. Contact your platform administrator.",
        403,
      );
    }
  }

  // ==================== Admin-side ====================

  async listOrders(
    tenantId: string,
    query: ListWebsiteOrdersQuery,
  ): Promise<{
    orders: WebsiteOrderListItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    await this.assertEnabled(tenantId);
    const [orders, total] = await this.repo.listOrders(tenantId, {
      page: query.page,
      limit: query.limit,
      status: query.status,
      search: query.search,
    });
    return { orders, total, page: query.page, limit: query.limit };
  }

  async getOrder(tenantId: string, id: string): Promise<WebsiteOrder> {
    await this.assertEnabled(tenantId);
    const order = await this.repo.getOrderById(tenantId, id);
    if (!order) throw createError("Order not found", 404);
    return order;
  }

  async verifyOrder(
    tenantId: string,
    id: string,
    userId: string,
  ): Promise<WebsiteOrder> {
    await this.assertEnabled(tenantId);
    const existing = await this.repo.getOrderById(tenantId, id);
    if (!existing) throw createError("Order not found", 404);
    if (existing.status === "REJECTED") {
      throw createError("Cannot verify a rejected order", 400);
    }
    if (existing.status === "CONVERTED_TO_SALE") {
      throw createError("Order has already been converted to a sale", 400);
    }
    return this.repo.updateOrder(tenantId, id, {
      status: "VERIFIED",
      verifiedAt: new Date(),
      verifier: { connect: { id: userId } },
    });
  }

  async rejectOrder(
    tenantId: string,
    id: string,
    userId: string,
    input: RejectOrderInput,
  ): Promise<WebsiteOrder> {
    await this.assertEnabled(tenantId);
    const existing = await this.repo.getOrderById(tenantId, id);
    if (!existing) throw createError("Order not found", 404);
    if (existing.status === "CONVERTED_TO_SALE") {
      throw createError("Cannot reject a converted order", 400);
    }
    return this.repo.updateOrder(tenantId, id, {
      status: "REJECTED",
      rejectedAt: new Date(),
      rejecter: { connect: { id: userId } },
      rejectionReason: input.reason,
    });
  }

  async deleteOrder(tenantId: string, id: string): Promise<void> {
    await this.assertEnabled(tenantId);
    const existing = await this.repo.getOrderById(tenantId, id);
    if (!existing) throw createError("Order not found", 404);
    if (existing.status === "CONVERTED_TO_SALE") {
      throw createError(
        "Cannot delete a converted order — the linked sale is authoritative",
        400,
      );
    }
    await this.repo.deleteOrder(tenantId, id);
  }

  async checkOrderStock(
    tenantId: string,
    orderId: string,
  ): Promise<
    Array<{
      productId: string;
      productName: string;
      variationId: string | null;
      quantity: number;
      stockByLocation: Array<{
        locationId: string;
        locationName: string;
        available: number;
      }>;
    }>
  > {
    await this.assertEnabled(tenantId);
    const order = await this.repo.getOrderById(tenantId, orderId);
    if (!order) throw createError("Order not found", 404);

    const snapshot = order.items as unknown as CartItemSnapshot[];
    if (!Array.isArray(snapshot)) return [];

    const results = [];
    for (const item of snapshot) {
      const product = await prisma.product.findFirst({
        where: { id: item.productId, tenantId, deletedAt: null },
        include: {
          variations: {
            where: { isActive: true },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              locationInventory: {
                select: {
                  quantity: true,
                  locationId: true,
                  location: {
                    select: {
                      id: true,
                      name: true,
                      type: true,
                      isActive: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Honor the customer-selected variation when the snapshot carries
      // one; otherwise fall back to the first active variation to match
      // the legacy single-variation behavior.
      const variation = item.variationId
        ? product?.variations.find((v) => v.id === item.variationId)
        : product?.variations[0];
      const stockByLocation = (variation?.locationInventory ?? [])
        .filter(
          (inv) => inv.location.type === "SHOWROOM" && inv.location.isActive,
        )
        .map((inv) => ({
          locationId: inv.location.id,
          locationName: inv.location.name,
          available: inv.quantity,
        }));

      results.push({
        productId: item.productId,
        productName: item.productName,
        variationId: variation?.id ?? null,
        quantity: item.quantity,
        stockByLocation,
      });
    }

    return results;
  }

  /**
   * Convert a verified order to a real Sale.
   *
   * For each item in the order's JSON snapshot, we look up the product
   * and pick the first active variation. If a product has no active
   * variation OR no longer exists, the conversion fails with a clear
   * error; the admin can either edit the order manually (itemOverrides)
   * or reject it.
   *
   * The actual sale creation goes through the existing `createSale`
   * service, which handles inventory decrement / member upsert /
   * workflow runs. We pass the customer's name + phone so a Member row
   * is auto-created if it doesn't exist.
   */
  async convertToSale(
    tenantId: string,
    id: string,
    userId: string,
    input: ConvertOrderInput,
  ): Promise<WebsiteOrder> {
    await this.assertEnabled(tenantId);
    const order = await this.repo.getOrderById(tenantId, id);
    if (!order) throw createError("Order not found", 404);
    if (order.status !== "VERIFIED") {
      throw createError("Only verified orders can be converted to sales", 400);
    }

    // Build the SaleItemInput list. If itemOverrides is supplied, trust
    // the caller's (productId, variationId, quantity) triples. Otherwise
    // walk the JSON snapshot and resolve variations on the fly.
    const saleItems: SaleItemInput[] = [];

    if (input.itemOverrides && input.itemOverrides.length > 0) {
      for (const o of input.itemOverrides) {
        saleItems.push({
          variationId: o.variationId,
          quantity: o.quantity,
        });
      }
    } else {
      const snapshot = order.items as unknown as CartItemSnapshot[];
      if (!Array.isArray(snapshot) || snapshot.length === 0) {
        throw createError("Order has no items to convert", 400);
      }

      for (const item of snapshot) {
        const product = await prisma.product.findFirst({
          where: { id: item.productId, tenantId, deletedAt: null },
          include: {
            variations: {
              where: { isActive: true },
              orderBy: { createdAt: "asc" },
            },
          },
        });

        if (!product) {
          throw createError(
            `Product "${item.productName}" (${item.productId}) is no longer available. Edit the order or reject it.`,
            400,
          );
        }

        // Prefer the customer's selected variation (PDP chip picker);
        // otherwise fall back to the product's first active variation
        // so pre-variation orders keep converting unchanged.
        const variation = item.variationId
          ? product.variations.find((v) => v.id === item.variationId)
          : product.variations[0];
        if (!variation) {
          throw createError(
            item.variationId
              ? `Variation "${item.variationLabel ?? item.variationId}" on "${item.productName}" is no longer available. Edit the order or reject it.`
              : `Product "${item.productName}" has no active variation. Edit the order or reject it.`,
            400,
          );
        }
        // Lock unit price to the snapshot so the sale total matches the
        // order total the customer agreed to, even if catalog pricing has
        // changed since checkout.
        saleItems.push({
          variationId: variation.id,
          quantity: item.quantity,
          customUnitPrice: Number(item.unitPrice),
          ...(item.subVariationId
            ? { subVariationId: item.subVariationId }
            : {}),
        });
      }
    }

    // Handle per-item location overrides — auto-transfer stock to the primary location
    if (input.itemLocationOverrides && input.itemLocationOverrides.length > 0) {
      const snapshot = order.items as unknown as CartItemSnapshot[];
      for (const override of input.itemLocationOverrides) {
        if (override.sourceLocationId === input.locationId) continue;

        // Find the matching sale item
        const snapshotItem = snapshot.find(
          (s) => s.productId === override.productId,
        );
        const saleItem = saleItems.find((_si, idx) => {
          const matchingSnapshot = snapshot[idx];
          return matchingSnapshot?.productId === override.productId;
        });

        if (!saleItem || !snapshotItem) continue;

        // Create an auto-transfer from source to primary location
        await transferService.createAndComplete(tenantId, userId, {
          fromLocationId: override.sourceLocationId,
          toLocationId: input.locationId,
          items: [
            {
              variationId: saleItem.variationId,
              quantity: snapshotItem.quantity,
            },
          ],
          notes: `Auto-transfer for website order ${order.orderCode}`,
        });
      }
    }

    // Call the existing sales service — this handles inventory,
    // member upsert, workflow rules, audit logs, everything.
    const payments = input.payments?.map((p) => ({
      method: p.method,
      amount: p.amount,
    }));
    const sale = await createSale(
      { tenantId, userId },
      {
        locationId: input.locationId,
        memberPhone: order.customerPhone,
        memberName: order.customerName,
        items: saleItems,
        notes: `From website order ${order.orderCode}${
          order.customerNote ? ` — customer note: ${order.customerNote}` : ""
        }`,
        payments,
        isCreditSale: input.isCreditSale,
      },
    );

    // Link the order to the sale and freeze it.
    return this.repo.updateOrder(tenantId, id, {
      status: "CONVERTED_TO_SALE",
      convertedAt: new Date(),
      converter: { connect: { id: userId } },
      sale: { connect: { id: sale.id } },
    });
  }

  // ==================== Public-facing (called from public-orders) ====================

  /**
   * Generate the next orderCode for this tenant: `WO-<year>-<4-digit seq>`.
   * Collisions are caught by the unique (tenantId, orderCode) constraint;
   * the caller retries.
   */
  async nextOrderCode(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const maxSeq = await this.repo.maxOrderSeqThisYear(tenantId, year);
    return `WO-${year}-${pad4(maxSeq + 1)}`;
  }

  /**
   * Create a new guest order. Called from the public-orders router on
   * every tenant-site checkout POST.
   */
  async createGuestOrder(
    tenantId: string,
    input: CreateOrderInput,
  ): Promise<WebsiteOrder> {
    await this.assertEnabled(tenantId);

    if (input.items.length === 0) {
      throw createError("Cart is empty", 400);
    }

    // Recompute the subtotal server-side from the snapshot so the client
    // can't lie about the total.
    const subtotal = input.items.reduce(
      (sum, i) => sum + i.unitPrice * i.quantity,
      0,
    );
    if (!Number.isFinite(subtotal) || subtotal < 0) {
      throw createError("Invalid cart totals", 400);
    }

    // Up to 3 attempts to generate a unique orderCode in case of a race
    // (concurrent checkouts can see the same count before either commits).
    for (let attempt = 0; attempt < 3; attempt++) {
      const orderCode = await this.nextOrderCode(tenantId);
      try {
        return await this.repo.createOrder(tenantId, {
          orderCode,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerEmail: input.customerEmail ?? null,
          customerNote: input.customerNote ?? null,
          items: input.items as unknown as Prisma.InputJsonValue,
          subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
          sourceIp: input.sourceIp ?? null,
          sourceUserAgent: input.sourceUserAgent ?? null,
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002" &&
          attempt < 2
        ) {
          continue;
        }
        throw err;
      }
    }

    throw createError("Failed to allocate order code", 500);
  }
}

export default new WebsiteOrdersService();
