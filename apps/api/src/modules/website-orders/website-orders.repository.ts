/**
 * WebsiteOrder repository.
 *
 * Uses the tenant-scoped `prisma` client — all reads + writes auto-scope
 * to the current tenant via AsyncLocalStorage. The service layer is the
 * tenant boundary, so update/delete use `{ where: { id } }` after a
 * tenant-scoped read.
 */

import prisma from "@/config/prisma";
import type { Prisma, WebsiteOrder } from "@prisma/client";

const LIST_SELECT = {
  id: true,
  tenantId: true,
  orderCode: true,
  status: true,
  customerName: true,
  customerPhone: true,
  customerEmail: true,
  items: true,
  subtotal: true,
  currency: true,
  verifiedAt: true,
  rejectedAt: true,
  convertedAt: true,
  convertedSaleId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.WebsiteOrderSelect;

export type WebsiteOrderListItem = Prisma.WebsiteOrderGetPayload<{
  select: typeof LIST_SELECT;
}>;

export class WebsiteOrdersRepository {
  listOrders(
    tenantId: string,
    opts: {
      page: number;
      limit: number;
      status?:
        | "PENDING_VERIFICATION"
        | "VERIFIED"
        | "REJECTED"
        | "CONVERTED_TO_SALE";
      search?: string;
    },
  ): Promise<[WebsiteOrderListItem[], number]> {
    const where: Prisma.WebsiteOrderWhereInput = {
      tenantId,
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.search
        ? {
            OR: [
              {
                customerName: {
                  contains: opts.search,
                  mode: "insensitive",
                },
              },
              {
                customerPhone: {
                  contains: opts.search,
                  mode: "insensitive",
                },
              },
              {
                orderCode: {
                  contains: opts.search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    };

    return Promise.all([
      prisma.websiteOrder.findMany({
        where,
        select: LIST_SELECT,
        orderBy: [{ createdAt: "desc" }],
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      prisma.websiteOrder.count({ where }),
    ]);
  }

  getOrderById(tenantId: string, id: string): Promise<WebsiteOrder | null> {
    return prisma.websiteOrder.findFirst({ where: { id, tenantId } });
  }

  async maxOrderSeqThisYear(tenantId: string, year: number): Promise<number> {
    // Parse the numeric suffix of the highest existing `WO-<year>-<nnnn>` code
    // for this tenant. Using COUNT(*) instead drifts behind whenever an order
    // is hard-deleted, which then hands the next caller a colliding code.
    // Zero-padded 4-digit suffixes sort lexicographically, so ORDER BY on the
    // string column is enough (valid up to 9999 per tenant per year).
    const prefix = `WO-${year}-`;
    const row = await prisma.websiteOrder.findFirst({
      where: { tenantId, orderCode: { startsWith: prefix } },
      orderBy: { orderCode: "desc" },
      select: { orderCode: true },
    });
    if (!row) return 0;
    const n = parseInt(row.orderCode.slice(prefix.length), 10);
    return Number.isFinite(n) ? n : 0;
  }

  createOrder(
    tenantId: string,
    data: Omit<Prisma.WebsiteOrderCreateInput, "tenant">,
  ): Promise<WebsiteOrder> {
    return prisma.websiteOrder.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  updateOrder(
    _tenantId: string,
    id: string,
    data: Prisma.WebsiteOrderUpdateInput,
  ): Promise<WebsiteOrder> {
    return prisma.websiteOrder.update({ where: { id }, data });
  }

  deleteOrder(_tenantId: string, id: string): Promise<WebsiteOrder> {
    return prisma.websiteOrder.delete({ where: { id } });
  }
}

export default new WebsiteOrdersRepository();
