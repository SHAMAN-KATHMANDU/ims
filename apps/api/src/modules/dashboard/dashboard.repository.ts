/**
 * Dashboard repository: all Prisma access for user/admin/superadmin summaries.
 * Where clauses are built in the service; tenant scoping applied there.
 */

import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

export function findUserLastLogin(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { lastLoginAt: true },
  });
}

export function aggregateSales(where: Prisma.SaleWhereInput) {
  return prisma.sale.aggregate({
    where,
    _count: true,
    _sum: { total: true },
  });
}

export function findSales(
  where: Prisma.SaleWhereInput,
  opts: {
    select: Prisma.SaleSelect;
    orderBy?: Prisma.SaleOrderByWithRelationInput;
    take?: number;
  },
) {
  return prisma.sale.findMany({
    where,
    select: opts.select,
    orderBy: opts.orderBy,
    take: opts.take,
  });
}

export function findCreditSalesWithPayments(where: Prisma.SaleWhereInput) {
  return prisma.sale.findMany({
    where,
    select: {
      id: true,
      saleCode: true,
      total: true,
      createdAt: true,
      payments: { select: { amount: true } },
    },
  });
}

export function findLocationInventoryForValue(tenantId: string) {
  return prisma.locationInventory.findMany({
    where: { location: { tenantId } },
    select: {
      quantity: true,
      variation: {
        select: {
          product: { select: { costPrice: true, mrp: true } },
        },
      },
    },
  });
}

export function groupByLocationInventoryByVariation(
  where?: Prisma.LocationInventoryWhereInput,
) {
  return prisma.locationInventory.groupBy({
    by: ["variationId"],
    where,
    _sum: { quantity: true },
  });
}

export function groupByTransfers(where: Prisma.TransferWhereInput) {
  return prisma.transfer.groupBy({
    by: ["status"],
    where,
    _count: true,
  });
}

export function groupBySalesByLocation(where: Prisma.SaleWhereInput) {
  return prisma.sale.groupBy({
    by: ["locationId"],
    where,
    _sum: { total: true },
  });
}

export function findLocationsByIds(ids: string[]) {
  if (ids.length === 0) return Promise.resolve([]);
  return prisma.location.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
}

export function countUsers(where: Prisma.UserWhereInput) {
  return prisma.user.count({ where });
}

export function groupByErrorReports(where?: Prisma.ErrorReportWhereInput) {
  return prisma.errorReport.groupBy({
    by: ["status"],
    where,
    _count: true,
  });
}

export function findAuditLogsRecent(
  take: number,
  include: Prisma.AuditLogInclude,
) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include,
  });
}

export function aggregateSaleDiscount(where: Prisma.SaleWhereInput) {
  return prisma.sale.aggregate({
    where,
    _sum: { discount: true },
  });
}

export function countLocationInventoryNegative(
  where: Prisma.LocationInventoryWhereInput,
) {
  return prisma.locationInventory.count({ where });
}
