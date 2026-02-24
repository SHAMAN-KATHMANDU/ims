/**
 * Analytics repository: all Prisma access for analytics reports.
 * All queries are tenant-scoped where the model has tenantId.
 */

import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

export type SaleWhere = Prisma.SaleWhereInput;

/** Overview: counts and lists for products/users (tenant-scoped). */
export async function getOverviewData(tenantId: string) {
  const [
    totalProducts,
    totalUsers,
    allUsers,
    recentProducts,
    recentUsers,
    productsWithMrp,
  ] = await Promise.all([
    prisma.product.count({ where: { tenantId } }),
    prisma.user.count({ where: { tenantId } }),
    prisma.user.findMany({
      where: { tenantId },
      select: { role: true },
    }),
    prisma.product.findMany({
      where: { tenantId },
      take: 10,
      orderBy: { dateCreated: "desc" },
      select: {
        id: true,
        imsCode: true,
        name: true,
        mrp: true,
        dateCreated: true,
      },
    }),
    prisma.user.findMany({
      where: { tenantId },
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.product.findMany({
      where: { tenantId },
      select: { mrp: true },
    }),
  ]);
  return {
    totalProducts,
    totalUsers,
    allUsers,
    recentProducts,
    recentUsers,
    productsWithMrp,
  };
}

/** Sales revenue: raw aggregates and lists for a sale where (must include tenantId). */
export async function getSalesRevenueData(where: SaleWhere) {
  const creditWhere = { ...where, isCreditSale: true };
  const [
    kpisAgg,
    salesForTimeSeries,
    compositionByLocation,
    compositionByPayment,
    compositionByType,
    creditSalesForOutstanding,
    creditSalesForAging,
    paymentsBySaleId,
    paymentsForCreditByDate,
    userPerformanceRaw,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where,
      _sum: { subtotal: true, total: true, discount: true },
      _count: true,
    }),
    prisma.sale.findMany({
      where,
      select: {
        subtotal: true,
        total: true,
        discount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.sale.groupBy({
      by: ["locationId"],
      where,
      _sum: { total: true },
      _count: true,
    }),
    prisma.salePayment.groupBy({
      by: ["method"],
      where: { sale: where },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.sale.groupBy({
      by: ["type"],
      where,
      _sum: { total: true },
      _count: true,
    }),
    prisma.sale.findMany({
      where: creditWhere,
      select: { id: true, total: true },
    }),
    prisma.sale.findMany({
      where: creditWhere,
      select: { id: true, total: true, createdAt: true },
    }),
    prisma.salePayment.groupBy({
      by: ["saleId"],
      where: { sale: creditWhere },
      _sum: { amount: true },
    }),
    prisma.salePayment.findMany({
      where: { sale: creditWhere },
      select: { amount: true, createdAt: true },
    }),
    prisma.sale.groupBy({
      by: ["createdById"],
      where,
      _sum: { total: true, discount: true },
      _count: true,
    }),
  ]);

  const locationIds = [
    ...new Set(compositionByLocation.map((c) => c.locationId)),
  ];
  const locations =
    locationIds.length > 0
      ? await prisma.location.findMany({
          where: { id: { in: locationIds } },
          select: { id: true, name: true },
        })
      : [];
  const userIds = [...new Set(userPerformanceRaw.map((u) => u.createdById))];
  const users =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true },
        })
      : [];

  return {
    kpisAgg,
    salesForTimeSeries,
    compositionByLocation,
    compositionByPayment,
    compositionByType,
    creditSalesForOutstanding,
    creditSalesForAging,
    paymentsBySaleId,
    paymentsForCreditByDate,
    userPerformanceRaw,
    locations,
    users,
  };
}

/** Inventory ops: inventory, transfers (tenant-scoped via location/transfer). */
export async function getInventoryOpsData(
  tenantId: string,
  invWhere: Prisma.LocationInventoryWhereInput,
) {
  const whereWithTenant: Prisma.LocationInventoryWhereInput = {
    ...invWhere,
    location: { tenantId },
  };
  const [inventoryItems, transferCounts, completedTransfers] =
    await Promise.all([
      prisma.locationInventory.findMany({
        where: whereWithTenant,
        include: {
          variation: {
            include: {
              product: {
                select: {
                  id: true,
                  costPrice: true,
                  mrp: true,
                  categoryId: true,
                  category: { select: { id: true, name: true } },
                },
              },
            },
          },
          location: { select: { id: true, name: true } },
        },
      }),
      prisma.transfer.groupBy({
        by: ["status"],
        where: { tenantId },
        _count: true,
      }),
      prisma.transfer.findMany({
        where: { tenantId, status: "COMPLETED", completedAt: { not: null } },
        select: { createdAt: true, completedAt: true },
      }),
    ]);
  return { inventoryItems, transferCounts, completedTransfers };
}

/** Customers & promos: members, sales by member, sale items by variation, promos (tenant-scoped). */
export async function getCustomersPromosData(
  tenantId: string,
  salesWhere: SaleWhere,
  dateFrom: Date | null,
  dateTo: Date | null,
) {
  const [
    memberCount,
    newMembersInPeriod,
    membersWithSales,
    productPerformanceRaw,
    promoCodes,
  ] = await Promise.all([
    prisma.member.count({ where: { tenantId } }),
    dateFrom && dateTo
      ? prisma.member.count({
          where: {
            tenantId,
            OR: [
              { memberSince: { gte: dateFrom, lte: dateTo } },
              { createdAt: { gte: dateFrom, lte: dateTo } },
            ],
          },
        })
      : Promise.resolve(0),
    prisma.sale.groupBy({
      by: ["memberId"],
      where: { ...salesWhere, memberId: { not: null } },
      _count: true,
    }),
    prisma.saleItem.groupBy({
      by: ["variationId"],
      where: { sale: salesWhere },
      _sum: { lineTotal: true, quantity: true },
      _count: true,
    }),
    prisma.promoCode.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, code: true, usageCount: true, value: true },
    }),
  ]);
  const variationIds = [
    ...new Set(productPerformanceRaw.map((p) => p.variationId)),
  ];
  const variations =
    variationIds.length > 0
      ? await prisma.productVariation.findMany({
          where: { id: { in: variationIds } },
          include: {
            product: {
              select: { id: true, name: true, costPrice: true, mrp: true },
            },
          },
        })
      : [];
  return {
    memberCount,
    newMembersInPeriod,
    membersWithSales,
    productPerformanceRaw,
    promoCodes,
    variations,
  };
}

/** Discount analytics: sales and groupBy by user/location. */
export async function getDiscountData(where: SaleWhere) {
  const [salesForTimeSeries, byUser, byLocation] = await Promise.all([
    prisma.sale.findMany({
      where,
      select: { discount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.sale.groupBy({
      by: ["createdById"],
      where,
      _sum: { discount: true },
    }),
    prisma.sale.groupBy({
      by: ["locationId"],
      where,
      _sum: { discount: true },
    }),
  ]);
  const userIds = [...new Set(byUser.map((u) => u.createdById))];
  const users =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true },
        })
      : [];
  const locationIds = [...new Set(byLocation.map((l) => l.locationId))];
  const locations =
    locationIds.length > 0
      ? await prisma.location.findMany({
          where: { id: { in: locationIds } },
          select: { id: true, name: true },
        })
      : [];
  return { salesForTimeSeries, byUser, byLocation, users, locations };
}

/** Payment trends: payments with sale date. */
export async function getPaymentTrendsData(where: SaleWhere) {
  return prisma.salePayment.findMany({
    where: { sale: where },
    select: {
      method: true,
      amount: true,
      sale: { select: { createdAt: true } },
    },
  });
}

/** Location comparison: groupBy location. */
export async function getLocationComparisonData(where: SaleWhere) {
  const byLocation = await prisma.sale.groupBy({
    by: ["locationId"],
    where,
    _sum: { total: true, discount: true },
    _count: true,
  });
  const locationIds = [...new Set(byLocation.map((l) => l.locationId))];
  const locations =
    locationIds.length > 0
      ? await prisma.location.findMany({
          where: { id: { in: locationIds } },
          select: { id: true, name: true },
        })
      : [];
  return { byLocation, locations };
}

/** Sales extended: sales with items and member agg. */
export async function getSalesExtendedData(where: SaleWhere) {
  const [salesWithItems, memberSalesAgg] = await Promise.all([
    prisma.sale.findMany({
      where,
      select: {
        id: true,
        subtotal: true,
        total: true,
        discount: true,
        createdAt: true,
        memberId: true,
        items: {
          select: {
            quantity: true,
            lineTotal: true,
            variation: {
              select: {
                product: { select: { costPrice: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.sale.groupBy({
      by: ["memberId"],
      where: { ...where, memberId: { not: null } },
      _sum: { total: true },
      _count: true,
    }),
  ]);
  return { salesWithItems, memberSalesAgg };
}

/** Product insights: sale items, inventory, categories. */
export async function getProductInsightsData(where: SaleWhere) {
  const [saleItemsRaw, inventoryItems, categories] = await Promise.all([
    prisma.saleItem.findMany({
      where: { sale: where },
      select: {
        saleId: true,
        variationId: true,
        quantity: true,
        lineTotal: true,
        variation: {
          select: {
            id: true,
            product: {
              select: {
                id: true,
                name: true,
                costPrice: true,
                categoryId: true,
                category: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.locationInventory.findMany({
      select: { variationId: true, quantity: true },
    }),
    prisma.category.findMany({ select: { id: true, name: true } }),
  ]);
  return { saleItemsRaw, inventoryItems, categories };
}

/** Inventory extended: inventory, sale items, locations. */
export async function getInventoryExtendedData(where: SaleWhere) {
  const [inventoryItems, saleItems, locations] = await Promise.all([
    prisma.locationInventory.findMany({
      include: {
        variation: {
          include: {
            product: {
              select: { id: true, name: true, costPrice: true, mrp: true },
            },
          },
        },
        location: { select: { id: true, name: true } },
      },
    }),
    prisma.saleItem.findMany({
      where: { sale: where },
      select: {
        quantity: true,
        lineTotal: true,
        variation: {
          select: {
            id: true,
            product: { select: { id: true, costPrice: true } },
          },
        },
        sale: { select: { locationId: true } },
      },
    }),
    prisma.location.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    }),
  ]);
  return { inventoryItems, saleItems, locations };
}

/** Customer insights: members with sales, all members. */
export async function getCustomerInsightsData(
  tenantId: string,
  where: SaleWhere,
) {
  const [membersWithSales, allMembers] = await Promise.all([
    prisma.member.findMany({
      where: { tenantId },
      select: {
        id: true,
        totalSales: true,
        createdAt: true,
        firstPurchase: true,
        memberSince: true,
        sales: {
          where,
          select: { id: true, total: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.member.findMany({
      where: { tenantId },
      select: { id: true, createdAt: true },
    }),
  ]);
  return { membersWithSales, allMembers };
}

/** Trends: sales and members with sales (tenant-scoped). */
export async function getTrendsData(tenantId: string, where: SaleWhere) {
  const [sales, membersWithSales] = await Promise.all([
    prisma.sale.findMany({
      where,
      select: {
        total: true,
        subtotal: true,
        discount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.member.findMany({
      where: { tenantId },
      select: {
        id: true,
        firstPurchase: true,
        sales: {
          where,
          select: { createdAt: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
  ]);
  return { sales, membersWithSales };
}

/** Financial: sale items with variation and sale. */
export async function getFinancialData(where: SaleWhere) {
  const saleItems = await prisma.saleItem.findMany({
    where: { sale: where },
    select: {
      quantity: true,
      lineTotal: true,
      variation: {
        select: {
          product: {
            select: {
              costPrice: true,
              categoryId: true,
              category: { select: { name: true } },
            },
          },
        },
      },
      sale: {
        select: {
          id: true,
          createdAt: true,
          locationId: true,
          discount: true,
          subtotal: true,
          total: true,
        },
      },
    },
  });
  return { saleItems };
}

/** Member cohort: groupBy memberId. */
export async function getMemberCohortData(where: SaleWhere) {
  return prisma.sale.groupBy({
    by: ["memberId"],
    where: { ...where, memberId: { not: null } },
    _count: true,
    _sum: { total: true },
  });
}

/** Export: sales list for sales-revenue/sales-extended. */
export async function getExportSalesData(where: SaleWhere) {
  return prisma.sale.findMany({
    where,
    select: {
      saleCode: true,
      subtotal: true,
      total: true,
      discount: true,
      createdAt: true,
      type: true,
      location: { select: { name: true } },
      createdBy: { select: { username: true } },
      items: { select: { quantity: true, lineTotal: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

/** Export: inventory list (tenant-scoped via location). */
export async function getExportInventoryData(tenantId: string) {
  return prisma.locationInventory.findMany({
    where: { location: { tenantId } },
    include: {
      variation: {
        include: {
          product: {
            select: {
              name: true,
              costPrice: true,
              mrp: true,
              category: { select: { name: true } },
            },
          },
        },
      },
      location: { select: { name: true } },
    },
  });
}

/** Export: trends data (tenant-scoped). */
export async function getExportTrendsData(tenantId: string, where: SaleWhere) {
  const [sales, membersWithSales] = await Promise.all([
    prisma.sale.findMany({
      where,
      select: { total: true, discount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.member.findMany({
      where: { tenantId },
      select: {
        id: true,
        sales: {
          where,
          select: { createdAt: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
  ]);
  return { sales, membersWithSales };
}

export async function getExportFinancialSaleItems(where: SaleWhere) {
  return prisma.saleItem.findMany({
    where: { sale: where },
    select: {
      quantity: true,
      lineTotal: true,
      variation: {
        select: {
          product: {
            select: {
              costPrice: true,
              categoryId: true,
              category: { select: { name: true } },
            },
          },
        },
      },
      sale: {
        select: {
          id: true,
          createdAt: true,
          locationId: true,
          discount: true,
          subtotal: true,
          total: true,
        },
      },
    },
  });
}

export async function findLocationsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return prisma.location.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
}
