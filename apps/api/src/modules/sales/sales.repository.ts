/**
 * Sales repository - all database access for sales module.
 * No business logic, no validation, Prisma only.
 */

import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

export const salesRepository = {
  findLocation(id: string, tenantId: string) {
    return prisma.location.findFirst({
      where: { id, tenantId },
    });
  },

  findMemberByPhone(tenantId: string, phone: string) {
    const normalized = String(phone).replace(/[\s-]/g, "").trim();
    return prisma.member.findFirst({
      where: { tenantId, phone: normalized },
      select: {
        id: true,
        isActive: true,
        createdAt: true,
        firstPurchase: true,
      },
    });
  },

  createMember(data: {
    tenantId: string;
    phone: string;
    name?: string | null;
  }) {
    return prisma.member.create({
      data: {
        tenantId: data.tenantId,
        phone: data.phone,
        name: data.name ?? null,
      },
    });
  },

  findVariationWithDiscounts(variationId: string) {
    const now = new Date();
    return prisma.productVariation.findUnique({
      where: { id: variationId },
      include: {
        subVariations: { select: { id: true, name: true } },
        product: {
          include: {
            discounts: {
              where: {
                isActive: true,
                OR: [{ startDate: null }, { startDate: { lte: now } }],
                AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
              },
              include: { discountType: true },
            },
          },
        },
      },
    });
  },

  findInventory(
    locationId: string,
    variationId: string,
    subVariationId: string | null,
  ) {
    if (subVariationId != null) {
      return prisma.locationInventory.findUnique({
        where: {
          locationId_variationId_subVariationId: {
            locationId,
            variationId,
            subVariationId,
          },
        },
      });
    }
    return prisma.locationInventory.findFirst({
      where: {
        locationId,
        variationId,
        subVariationId: null,
      },
    });
  },

  findPromoByCode(tenantId: string, code: string) {
    return prisma.promoCode.findFirst({
      where: { tenantId, code },
      include: {
        products: { include: { product: true } },
      },
    });
  },

  incrementPromoUsage(promoId: string) {
    return prisma.promoCode.update({
      where: { id: promoId },
      data: { usageCount: { increment: 1 } },
    });
  },

  createSale(data: Prisma.SaleCreateInput) {
    return prisma.sale.create({
      data,
      include: {
        location: { select: { id: true, name: true } },
        member: { select: { id: true, phone: true, name: true } },
        createdBy: { select: { id: true, username: true } },
        items: {
          include: {
            variation: {
              include: {
                product: { select: { id: true, name: true, imsCode: true } },
              },
            },
            subVariation: { select: { id: true, name: true } },
          },
        },
        payments: true,
      },
    });
  },

  createSalePayment(data: { saleId: string; method: string; amount: number }) {
    return prisma.salePayment.create({
      data: {
        saleId: data.saleId,
        method: data.method as "CASH" | "CARD" | "CHEQUE" | "FONEPAY" | "QR",
        amount: data.amount,
      },
    });
  },

  findSales(params: {
    where: Prisma.SaleWhereInput;
    orderBy: Prisma.SaleOrderByWithRelationInput;
    skip: number;
    take: number;
  }) {
    return prisma.sale.findMany({
      where: params.where,
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
      include: {
        location: { select: { id: true, name: true } },
        member: { select: { id: true, phone: true, name: true } },
        createdBy: { select: { id: true, username: true } },
        payments: {
          select: { method: true, amount: true },
          take: 1,
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { items: true } },
      },
    });
  },

  countSales(where: Prisma.SaleWhereInput) {
    return prisma.sale.count({ where });
  },

  findSaleById(id: string) {
    return prisma.sale.findUnique({
      where: { id },
      include: {
        location: { select: { id: true, name: true } },
        member: { select: { id: true, phone: true, name: true } },
        createdBy: { select: { id: true, username: true } },
        items: {
          include: {
            variation: {
              include: {
                product: { select: { id: true, name: true, imsCode: true } },
              },
            },
            subVariation: { select: { id: true, name: true } },
          },
        },
        payments: true,
      },
    });
  },

  async updateInventoryDecrement(params: {
    locationId: string;
    variationId: string;
    subVariationId: string | null;
    quantity: number;
    tx?: Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
  }) {
    const client = params.tx ?? prisma;
    const where =
      params.subVariationId != null
        ? {
            locationId_variationId_subVariationId: {
              locationId: params.locationId,
              variationId: params.variationId,
              subVariationId: params.subVariationId,
            },
          }
        : {
            locationId: params.locationId,
            variationId: params.variationId,
            subVariationId: null,
          };
    const inv = await client.locationInventory.findFirst({ where });
    if (!inv) throw new Error("Inventory not found");
    return client.locationInventory.update({
      where: { id: inv.id },
      data: { quantity: { decrement: params.quantity } },
    });
  },

  updateMemberStats(
    memberId: string,
    data: { totalSales: number; memberSince?: Date; firstPurchase?: Date },
  ) {
    return prisma.member.update({
      where: { id: memberId },
      data: {
        totalSales: { increment: data.totalSales },
        memberSince: data.memberSince,
        firstPurchase: data.firstPurchase,
      },
    });
  },

  createAuditLog(data: {
    tenantId: string;
    userId: string;
    action: string;
    resource: string;
    resourceId: string;
    details?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
  }) {
    return prisma.auditLog.create({ data });
  },

  aggregateSales(params: Parameters<typeof prisma.sale.aggregate>[0]) {
    return prisma.sale.aggregate(params);
  },

  groupBySales(params: {
    by: "createdAt"[];
    where: Prisma.SaleWhereInput;
    _sum?: { total: true };
    _count?: true;
  }) {
    return prisma.sale.groupBy(params);
  },

  findSalesForExport(where: Prisma.SaleWhereInput) {
    return prisma.sale.findMany({
      where,
      include: {
        location: true,
        member: true,
        createdBy: { select: { id: true, username: true } },
        payments: true,
        items: {
          include: {
            variation: {
              include: {
                product: {
                  include: { category: true },
                },
              },
            },
            subVariation: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
