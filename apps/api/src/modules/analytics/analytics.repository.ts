import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

type SaleWhereInput = Prisma.SaleWhereInput;
type LocationInventoryWhereInput = Prisma.LocationInventoryWhereInput;

export class AnalyticsRepository {
  // --- Overview ---
  async getOverviewData() {
    const [totalProducts, totalUsers, allUsers, recentProducts, recentUsers] =
      await Promise.all([
        prisma.product.count(),
        prisma.user.count(),
        prisma.user.findMany({ select: { role: true } }),
        prisma.product.findMany({
          take: 10,
          orderBy: { dateCreated: "desc" },
          select: {
            id: true,
            name: true,
            mrp: true,
            dateCreated: true,
          },
        }),
        prisma.user.findMany({
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            username: true,
            role: true,
            createdAt: true,
          },
        }),
      ]);
    const productsWithMrp = await prisma.product.findMany({
      select: { mrp: true },
    });
    return {
      totalProducts,
      totalUsers,
      allUsers,
      recentProducts,
      recentUsers,
      productsWithMrp,
    };
  }

  // --- Sales Revenue ---
  async getSalesRevenueData(
    where: SaleWhereInput,
    saleWhereForChildren: SaleWhereInput,
  ) {
    const creditWhere = { ...where, isCreditSale: true };
    const saleWhereForChildrenCredit = {
      ...saleWhereForChildren,
      isCreditSale: true,
    };

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
        where: { sale: saleWhereForChildren },
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
        where: { sale: saleWhereForChildrenCredit },
        _sum: { amount: true },
      }),
      prisma.salePayment.findMany({
        where: { sale: saleWhereForChildrenCredit },
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

  // --- Inventory Ops ---
  async getInventoryOpsData(invWhere: LocationInventoryWhereInput) {
    const [inventoryItems, transferCounts, completedTransfers] =
      await Promise.all([
        prisma.locationInventory.findMany({
          where: invWhere,
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
          _count: true,
        }),
        prisma.transfer.findMany({
          where: { status: "COMPLETED", completedAt: { not: null } },
          select: {
            createdAt: true,
            completedAt: true,
          },
        }),
      ]);
    return { inventoryItems, transferCounts, completedTransfers };
  }

  // --- Customers Promos ---
  async getCustomersPromosData(
    salesWhere: SaleWhereInput,
    saleWhereForChildren: SaleWhereInput,
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
      prisma.member.count(),
      dateFrom && dateTo
        ? prisma.member.count({
            where: {
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
        where: { sale: saleWhereForChildren },
        _sum: { lineTotal: true, quantity: true },
        _count: true,
      }),
      prisma.promoCode.findMany({
        where: { isActive: true },
        select: {
          id: true,
          code: true,
          usageCount: true,
          value: true,
        },
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
                select: {
                  id: true,
                  name: true,
                  costPrice: true,
                  mrp: true,
                },
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

  // --- Discount Analytics ---
  async getDiscountAnalyticsData(where: SaleWhereInput) {
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

    return {
      salesForTimeSeries,
      byUser,
      byLocation,
      users,
      locations,
    };
  }

  // --- Payment Trends ---
  async getPaymentTrendsData(saleWhereForChildren: SaleWhereInput) {
    return prisma.salePayment.findMany({
      where: { sale: saleWhereForChildren },
      select: {
        method: true,
        amount: true,
        sale: { select: { createdAt: true } },
      },
    });
  }

  // --- Location Comparison ---
  async getLocationComparisonData(where: SaleWhereInput) {
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

  // --- Sales Extended ---
  async getSalesExtendedData(where: SaleWhereInput) {
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

  // --- Product Insights ---
  async getProductInsightsData(
    saleWhereForChildren: SaleWhereInput,
    invWhere: LocationInventoryWhereInput,
  ) {
    const [saleItemsRaw, inventoryItems, categories] = await Promise.all([
      prisma.saleItem.findMany({
        where: { sale: saleWhereForChildren },
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
        where: invWhere,
        select: { variationId: true, quantity: true },
      }),
      prisma.category.findMany({ select: { id: true, name: true } }),
    ]);
    return { saleItemsRaw, inventoryItems, categories };
  }

  // --- Inventory Extended ---
  async getInventoryExtendedData(
    invWhere: LocationInventoryWhereInput,
    saleWhereForChildren: SaleWhereInput,
  ) {
    const [inventoryItems, saleItems, locations] = await Promise.all([
      prisma.locationInventory.findMany({
        where: invWhere,
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
        where: { sale: saleWhereForChildren },
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

  // --- Customer Insights ---
  async getCustomerInsightsData(where: SaleWhereInput) {
    const [membersWithSales, allMembers] = await Promise.all([
      prisma.member.findMany({
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
        select: { id: true, createdAt: true },
      }),
    ]);
    return { membersWithSales, allMembers };
  }

  // --- Trends ---
  async getTrendsData(where: SaleWhereInput) {
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

  // --- Financial ---
  async getFinancialData(saleWhereForChildren: SaleWhereInput) {
    const saleItems = await prisma.saleItem.findMany({
      where: { sale: saleWhereForChildren },
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

    const locationIds = [
      ...new Set(
        saleItems.map((i) => (i.sale as { locationId: string }).locationId),
      ),
    ];
    const locations =
      locationIds.length > 0
        ? await prisma.location.findMany({
            where: { id: { in: locationIds } },
            select: { id: true, name: true },
          })
        : [];

    return { saleItems, locations };
  }

  // --- Member Cohort ---
  async getMemberCohortData(where: SaleWhereInput) {
    return prisma.sale.groupBy({
      by: ["memberId"],
      where: { ...where, memberId: { not: null } },
      _count: true,
      _sum: { total: true },
    });
  }

  // --- Export: Sales Revenue / Sales Extended ---
  async getSalesForExport(where: SaleWhereInput) {
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

  // --- Export: Inventory Ops ---
  async getInventoryForExport(invWhere: LocationInventoryWhereInput) {
    return prisma.locationInventory.findMany({
      where: invWhere,
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

  // --- Export: Customers Promos (raw data) ---
  async getCustomersPromosForExport(
    salesWhere: SaleWhereInput,
    saleWhereForChildren: SaleWhereInput,
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
      prisma.member.count(),
      dateFrom && dateTo
        ? prisma.member.count({
            where: {
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
        where: { sale: saleWhereForChildren },
        _sum: { lineTotal: true, quantity: true },
        _count: true,
      }),
      prisma.promoCode.findMany({
        where: { isActive: true },
        select: { code: true, usageCount: true, value: true },
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
                select: { id: true, name: true, costPrice: true },
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

  // --- Export: Trends ---
  async getTrendsForExport(where: SaleWhereInput) {
    const [sales, membersWithSales] = await Promise.all([
      prisma.sale.findMany({
        where,
        select: { total: true, discount: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.member.findMany({
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

  async findLocationsByIds(ids: string[]) {
    if (ids.length === 0) return [];
    return prisma.location.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
  }

  // --- Export: Financial ---
  async getFinancialForExport(saleWhereForChildren: SaleWhereInput) {
    return prisma.saleItem.findMany({
      where: { sale: saleWhereForChildren },
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
}

export default new AnalyticsRepository();
