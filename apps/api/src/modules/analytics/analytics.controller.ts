import { Request, Response } from "express";
import prisma from "@/config/prisma";
import {
  parseAnalyticsFilters,
  getSalesWhereForAnalytics,
} from "./analytics.filters";

/** Calculate month difference between two "YYYY-MM" strings. */
function monthDifference(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

class AnalyticsController {
  /** Overview analytics (admin/superAdmin) – products and users summary */
  async getOverview(req: Request, res: Response) {
    try {
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
              imsCode: true,
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

      const usersByRole = [
        {
          role: "superAdmin" as const,
          count: allUsers.filter((u) => u.role === "superAdmin").length,
        },
        {
          role: "admin" as const,
          count: allUsers.filter((u) => u.role === "admin").length,
        },
        {
          role: "user" as const,
          count: allUsers.filter((u) => u.role === "user").length,
        },
      ];

      const productsWithMrp = await prisma.product.findMany({
        select: { mrp: true },
      });
      const totalValue = productsWithMrp.reduce(
        (sum, p) => sum + Number(p.mrp || 0),
        0,
      );

      res.status(200).json({
        message: "Analytics fetched successfully",
        analytics: {
          overview: {
            totalProducts,
            totalUsers,
            totalValue: totalValue.toFixed(2),
            averageProductPrice:
              totalProducts > 0
                ? (totalValue / totalProducts).toFixed(2)
                : "0.00",
          },
          usersByRole,
          recentProducts,
          recentUsers,
        },
      });
    } catch (error: unknown) {
      console.error("Get analytics error:", error);
      res.status(500).json({
        message: "Error fetching analytics",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Sales & Revenue analytics: KPIs, time series, composition, credit, user performance.
   * Uses shared filter + role so user role sees only own sales (createdById).
   */
  async getSalesRevenue(req: Request, res: Response) {
    try {
      const role = (req as any).user?.role as string | undefined;
      const currentUserId = (req as any).user?.id as string | undefined;
      const { where } = getSalesWhereForAnalytics(
        req.query,
        role,
        currentUserId,
      );

      const dateFrom =
        typeof req.query.dateFrom === "string"
          ? new Date(req.query.dateFrom)
          : undefined;
      const dateTo =
        typeof req.query.dateTo === "string" ? req.query.dateTo : undefined;
      let rangeEnd = dateTo ? new Date(dateTo) : new Date();
      rangeEnd.setHours(23, 59, 59, 999);
      let rangeStart = dateFrom || new Date(rangeEnd);
      if (!dateFrom && dateTo) rangeStart = new Date(dateTo);
      if (dateFrom) rangeStart = new Date(dateFrom);

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
      const locationMap = Object.fromEntries(
        locations.map((l) => [l.id, l.name]),
      );

      const userIds = [
        ...new Set(userPerformanceRaw.map((u) => u.createdById)),
      ];
      const users =
        userIds.length > 0
          ? await prisma.user.findMany({
              where: { id: { in: userIds } },
              select: { id: true, username: true },
            })
          : [];
      const userMap = Object.fromEntries(users.map((u) => [u.id, u.username]));

      const totalRevenue = Number(kpisAgg._sum.subtotal ?? 0);
      const netRevenue = Number(kpisAgg._sum.total ?? 0);
      const totalDiscount = Number(kpisAgg._sum.discount ?? 0);
      const salesCount = kpisAgg._count;
      const avgOrderValue = salesCount > 0 ? netRevenue / salesCount : 0;

      const paymentBySaleId = Object.fromEntries(
        paymentsBySaleId.map((p) => [p.saleId, Number(p._sum.amount ?? 0)]),
      );
      let outstandingCredit = 0;
      for (const sale of creditSalesForOutstanding) {
        const paid = paymentBySaleId[sale.id] ?? 0;
        const balance = Number(sale.total) - paid;
        if (balance > 0) outstandingCredit += balance;
      }

      const dailyMap: Record<
        string,
        { date: string; gross: number; net: number; discount: number }
      > = {};
      for (const s of salesForTimeSeries) {
        const d = s.createdAt.toISOString().slice(0, 10);
        if (!dailyMap[d])
          dailyMap[d] = { date: d, gross: 0, net: 0, discount: 0 };
        dailyMap[d].gross += Number(s.subtotal);
        dailyMap[d].net += Number(s.total);
        dailyMap[d].discount += Number(s.discount);
      }
      const timeSeries = Object.values(dailyMap).sort((a, b) =>
        a.date.localeCompare(b.date),
      );

      const creditIssuedByDate: Record<string, number> = {};
      for (const s of creditSalesForAging) {
        const d = s.createdAt.toISOString().slice(0, 10);
        creditIssuedByDate[d] = (creditIssuedByDate[d] ?? 0) + Number(s.total);
      }
      const paymentSumByDate: Record<string, number> = {};
      for (const p of paymentsForCreditByDate) {
        const d = p.createdAt.toISOString().slice(0, 10);
        paymentSumByDate[d] = (paymentSumByDate[d] ?? 0) + Number(p.amount);
      }
      const allCreditDates = new Set([
        ...Object.keys(creditIssuedByDate),
        ...Object.keys(paymentSumByDate),
      ]);
      const creditTimeSeries = [...allCreditDates].sort().map((date) => ({
        date,
        issued: creditIssuedByDate[date] ?? 0,
        paid: paymentSumByDate[date] ?? 0,
      }));

      const now = new Date();
      let aging0_7 = 0,
        aging8_30 = 0,
        aging30Plus = 0;
      for (const sale of creditSalesForAging) {
        const paid = paymentBySaleId[sale.id] ?? 0;
        if (Number(sale.total) <= paid) continue;
        const days = Math.floor(
          (now.getTime() - sale.createdAt.getTime()) / (24 * 60 * 60 * 1000),
        );
        const balance = Number(sale.total) - paid;
        if (days <= 7) aging0_7 += balance;
        else if (days <= 30) aging8_30 += balance;
        else aging30Plus += balance;
      }

      const compositionLocation = compositionByLocation.map((c) => ({
        locationId: c.locationId,
        locationName: locationMap[c.locationId] ?? c.locationId,
        revenue: Number(c._sum.total ?? 0),
        count: c._count,
      }));
      const compositionPayment = compositionByPayment.map((c) => ({
        method: c.method,
        revenue: Number(c._sum.amount ?? 0),
        count: c._count,
      }));
      const compositionType = compositionByType.map((c) => ({
        type: c.type,
        revenue: Number(c._sum.total ?? 0),
        count: c._count,
      }));

      const userPerformance = userPerformanceRaw.map((u) => ({
        userId: u.createdById,
        username: userMap[u.createdById] ?? u.createdById,
        revenue: Number(u._sum.total ?? 0),
        salesCount: u._count,
        avgDiscount: u._count > 0 ? Number(u._sum.discount ?? 0) / u._count : 0,
      }));

      res.status(200).json({
        message: "Sales revenue analytics fetched",
        data: {
          kpis: {
            totalRevenue,
            netRevenue,
            salesCount,
            avgOrderValue,
            totalDiscount,
            outstandingCredit,
          },
          timeSeries,
          composition: {
            byLocation: compositionLocation,
            byPaymentMethod: compositionPayment,
            bySaleType: compositionType,
          },
          credit: {
            timeSeries: creditTimeSeries,
            aging: { "0-7": aging0_7, "8-30": aging8_30, "30+": aging30Plus },
          },
          userPerformance,
        },
      });
    } catch (error: unknown) {
      console.error("Get sales revenue analytics error:", error);
      res.status(500).json({
        message: "Error fetching sales revenue analytics",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Inventory & Operations analytics: KPIs, health quadrant, heatmap, aging, transfer funnel.
   * Filter by date range, locationIds, categoryId, vendorId (no role scoping; inventory is workspace-level).
   */
  async getInventoryOps(req: Request, res: Response) {
    try {
      const filters = parseAnalyticsFilters(
        req.query as Record<string, unknown>,
      );

      const invWhere: Record<string, unknown> = {};
      if (filters.locationIds?.length) {
        invWhere.locationId = { in: filters.locationIds };
      }
      if (filters.categoryId || filters.vendorId) {
        invWhere.variation = {
          product: {
            ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
            ...(filters.vendorId ? { vendorId: filters.vendorId } : {}),
          },
        };
      }

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

      let totalStockValueCost = 0;
      let totalStockValueMrp = 0;
      const variationTotal: Record<string, number> = {};
      const categoryLocationValue: Record<string, Record<string, number>> = {};
      const productQuantity: Record<string, number> = {};
      const aging0_30: number[] = [];
      const aging31_60: number[] = [];
      const aging61_90: number[] = [];
      const aging90Plus: number[] = [];
      const now = new Date();
      const LOW_STOCK_THRESHOLD = 5;

      for (const inv of inventoryItems) {
        const qty = inv.quantity;
        const cost = Number(inv.variation.product.costPrice ?? 0);
        const mrp = Number(inv.variation.product.mrp ?? 0);
        totalStockValueCost += qty * cost;
        totalStockValueMrp += qty * mrp;
        const vid = inv.variation.id;
        variationTotal[vid] = (variationTotal[vid] ?? 0) + qty;

        const catName = inv.variation.product.category?.name ?? "Other";
        if (!categoryLocationValue[catName]) {
          categoryLocationValue[catName] = {};
        }
        categoryLocationValue[catName][inv.location.name] =
          (categoryLocationValue[catName][inv.location.name] ?? 0) + qty * mrp;

        const productId = inv.variation.product.id;
        productQuantity[productId] = (productQuantity[productId] ?? 0) + qty;

        const value = qty * mrp;
        const created = inv.createdAt.getTime();
        const days = (now.getTime() - created) / (24 * 60 * 60 * 1000);
        if (days <= 30) aging0_30.push(value);
        else if (days <= 60) aging31_60.push(value);
        else if (days <= 90) aging61_90.push(value);
        else aging90Plus.push(value);
      }

      // Low stock = variant total < threshold (so [2, 10] → one variant is low). Out of stock = variant total === 0.
      let lowStockCount = 0;
      let outOfStockCount = 0;
      for (const total of Object.values(variationTotal)) {
        const t = Number(total);
        if (t === 0) outOfStockCount += 1;
        if (t < LOW_STOCK_THRESHOLD) lowStockCount += 1;
      }

      const velocityQuantity = Object.entries(productQuantity).map(
        ([productId, quantity]) => ({
          velocity: 0,
          quantity,
          name: productId,
        }),
      );

      const heatmapRows = Object.entries(categoryLocationValue).map(
        ([category, locs]) => ({
          category,
          ...locs,
          total: Object.values(locs).reduce((a, b) => a + b, 0),
        }),
      );

      const funnel = {
        PENDING:
          transferCounts.find((t) => t.status === "PENDING")?._count ?? 0,
        APPROVED:
          transferCounts.find((t) => t.status === "APPROVED")?._count ?? 0,
        IN_TRANSIT:
          transferCounts.find((t) => t.status === "IN_TRANSIT")?._count ?? 0,
        COMPLETED:
          transferCounts.find((t) => t.status === "COMPLETED")?._count ?? 0,
      };

      let avgCompletionMs = 0;
      if (completedTransfers.length > 0) {
        const totalMs = completedTransfers.reduce(
          (sum, t) => sum + (t.completedAt!.getTime() - t.createdAt.getTime()),
          0,
        );
        avgCompletionMs = totalMs / completedTransfers.length;
      }

      const agingBuckets = {
        "0-30": aging0_30.reduce((a, b) => a + b, 0),
        "31-60": aging31_60.reduce((a, b) => a + b, 0),
        "61-90": aging61_90.reduce((a, b) => a + b, 0),
        "90+": aging90Plus.reduce((a, b) => a + b, 0),
      };

      res.status(200).json({
        message: "Inventory ops analytics fetched",
        data: {
          kpis: {
            totalStockValueCost,
            totalStockValueMrp,
            lowStockCount,
            outOfStockCount,
            deadStockValue: 0,
          },
          healthQuadrant: velocityQuantity.slice(0, 100),
          heatmap: heatmapRows,
          aging: agingBuckets,
          transferFunnel: funnel,
          avgTransferCompletionDays: avgCompletionMs / (24 * 60 * 60 * 1000),
        },
      });
    } catch (error: unknown) {
      console.error("Get inventory ops error:", error);
      res.status(500).json({
        message: "Error fetching inventory ops analytics",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Customers, Products & Promotions analytics: member KPIs, cohort, product performance, promo effectiveness.
   * Filter by date range, locationIds, categoryId, vendorId.
   */
  async getCustomersPromos(req: Request, res: Response) {
    try {
      const filters = parseAnalyticsFilters(
        req.query as Record<string, unknown>,
      );
      const role = (req as any).user?.role as string | undefined;
      const currentUserId = (req as any).user?.id as string | undefined;
      const { where: salesWhere } = getSalesWhereForAnalytics(
        req.query as Record<string, unknown>,
        role,
        currentUserId,
      );

      const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
      const dateTo = filters.dateTo
        ? (() => {
            const d = new Date(filters.dateTo);
            d.setHours(23, 59, 59, 999);
            return d;
          })()
        : null;

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
          where: { sale: salesWhere },
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

      const memberIdsWithSales = new Set(
        membersWithSales.map((m) => m.memberId).filter(Boolean) as string[],
      );
      const repeatCount = membersWithSales.filter((m) => m._count > 1).length;
      const repeatPercent =
        memberIdsWithSales.size > 0
          ? (repeatCount / memberIdsWithSales.size) * 100
          : 0;

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

      const productPerf = productPerformanceRaw.map((p) => {
        const v = variations.find((x) => x.id === p.variationId);
        const cost = v ? Number(v.product.costPrice ?? 0) : 0;
        const revenue = Number(p._sum.lineTotal ?? 0);
        const qty = Number(p._sum.quantity ?? 0) || p._count;
        const margin = revenue - qty * cost;
        return {
          productId: v?.product.id ?? p.variationId,
          productName: v?.product.name ?? p.variationId,
          revenue,
          quantity: qty,
          margin,
        };
      });

      res.status(200).json({
        message: "Customers promos analytics fetched",
        data: {
          memberKpis: {
            totalMembers: memberCount,
            newInPeriod: newMembersInPeriod,
            repeatPercent,
          },
          cohort: [],
          productPerformance: productPerf,
          promoEffectiveness: {
            promos: promoCodes.map((c) => ({
              code: c.code,
              usageCount: c.usageCount,
              value: Number(c.value),
            })),
            totalUsageCount: promoCodes.reduce((s, c) => s + c.usageCount, 0),
          },
        },
      });
    } catch (error: unknown) {
      console.error("Get customers promos error:", error);
      res.status(500).json({
        message: "Error fetching customers promos analytics",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Discount analytics: discount over time, by user, by location.
   * Reuses getSalesWhereForAnalytics for filters and role.
   */
  async getDiscountAnalytics(req: Request, res: Response) {
    try {
      const role = (req as any).user?.role as string | undefined;
      const currentUserId = (req as any).user?.id as string | undefined;
      const { where } = getSalesWhereForAnalytics(
        req.query,
        role,
        currentUserId,
      );

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

      const dailyMap: Record<string, number> = {};
      for (const s of salesForTimeSeries) {
        const d = s.createdAt.toISOString().slice(0, 10);
        dailyMap[d] = (dailyMap[d] ?? 0) + Number(s.discount);
      }
      const discountOverTime = Object.entries(dailyMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, discount]) => ({ date, discount }));

      const userIds = [...new Set(byUser.map((u) => u.createdById))];
      const users =
        userIds.length > 0
          ? await prisma.user.findMany({
              where: { id: { in: userIds } },
              select: { id: true, username: true },
            })
          : [];
      const userMap = Object.fromEntries(users.map((u) => [u.id, u.username]));

      const locationIds = [...new Set(byLocation.map((l) => l.locationId))];
      const locations =
        locationIds.length > 0
          ? await prisma.location.findMany({
              where: { id: { in: locationIds } },
              select: { id: true, name: true },
            })
          : [];
      const locationMap = Object.fromEntries(
        locations.map((l) => [l.id, l.name]),
      );

      res.status(200).json({
        message: "Discount analytics fetched",
        data: {
          discountOverTime,
          byUser: byUser.map((u) => ({
            userId: u.createdById,
            username: userMap[u.createdById] ?? u.createdById,
            discount: Number(u._sum.discount ?? 0),
          })),
          byLocation: byLocation.map((l) => ({
            locationId: l.locationId,
            locationName: locationMap[l.locationId] ?? l.locationId,
            discount: Number(l._sum.discount ?? 0),
          })),
        },
      });
    } catch (error: unknown) {
      console.error("Get discount analytics error:", error);
      res.status(500).json({
        message: "Error fetching discount analytics",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Payment method trends over time: daily totals per payment method.
   */
  async getPaymentTrends(req: Request, res: Response) {
    try {
      const role = (req as any).user?.role as string | undefined;
      const currentUserId = (req as any).user?.id as string | undefined;
      const { where } = getSalesWhereForAnalytics(
        req.query,
        role,
        currentUserId,
      );

      const payments = await prisma.salePayment.findMany({
        where: { sale: where },
        select: {
          method: true,
          amount: true,
          sale: { select: { createdAt: true } },
        },
      });

      const byDate: Record<string, Record<string, number>> = {};
      for (const p of payments) {
        const d = (p.sale as { createdAt: Date }).createdAt
          .toISOString()
          .slice(0, 10);
        if (!byDate[d]) byDate[d] = {};
        const method = p.method;
        byDate[d][method] = (byDate[d][method] ?? 0) + Number(p.amount);
      }
      const timeSeries = Object.entries(byDate)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, methods]) => ({ date, ...methods }));

      res.status(200).json({
        message: "Payment trends fetched",
        data: { timeSeries },
      });
    } catch (error: unknown) {
      console.error("Get payment trends error:", error);
      res.status(500).json({
        message: "Error fetching payment trends",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Location comparison: revenue, sales count, discount per location.
   */
  async getLocationComparison(req: Request, res: Response) {
    try {
      const role = (req as any).user?.role as string | undefined;
      const currentUserId = (req as any).user?.id as string | undefined;
      const { where } = getSalesWhereForAnalytics(
        req.query,
        role,
        currentUserId,
      );

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
      const locationMap = Object.fromEntries(
        locations.map((l) => [l.id, l.name]),
      );

      res.status(200).json({
        message: "Location comparison fetched",
        data: byLocation.map((l) => ({
          locationId: l.locationId,
          locationName: locationMap[l.locationId] ?? l.locationId,
          revenue: Number(l._sum.total ?? 0),
          salesCount: l._count,
          discount: Number(l._sum.discount ?? 0),
        })),
      });
    } catch (error: unknown) {
      console.error("Get location comparison error:", error);
      res.status(500).json({
        message: "Error fetching location comparison",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ================================================================
  // NEW ANALYTICS ENDPOINTS
  // ================================================================

  /**
   * Sales Extended: growth, basket size, day-of-week, hour-of-day, gross profit/margin.
   */
  async getSalesExtended(req: Request, res: Response) {
    try {
      const role = (req as any).user?.role as string | undefined;
      const currentUserId = (req as any).user?.id as string | undefined;
      const { where } = getSalesWhereForAnalytics(
        req.query,
        role,
        currentUserId,
      );

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

      // Monthly aggregates
      const monthlyMap: Record<
        string,
        { gross: number; net: number; discount: number; count: number }
      > = {};
      // Day of week (0=Sun..6=Sat)
      const dayOfWeek = Array.from({ length: 7 }, () => ({
        revenue: 0,
        count: 0,
      }));
      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      // Hour of day
      const hourOfDay = Array.from({ length: 24 }, () => ({
        revenue: 0,
        count: 0,
      }));
      // Basket & profit
      let totalItems = 0;
      let totalCogs = 0;
      let totalRevenue = 0;

      for (const sale of salesWithItems) {
        const gross = Number(sale.subtotal);
        const net = Number(sale.total);
        const disc = Number(sale.discount);
        const d = sale.createdAt;
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

        if (!monthlyMap[monthKey])
          monthlyMap[monthKey] = { gross: 0, net: 0, discount: 0, count: 0 };
        monthlyMap[monthKey].gross += gross;
        monthlyMap[monthKey].net += net;
        monthlyMap[monthKey].discount += disc;
        monthlyMap[monthKey].count += 1;

        const dow = d.getDay();
        dayOfWeek[dow].revenue += net;
        dayOfWeek[dow].count += 1;

        const hour = d.getHours();
        hourOfDay[hour].revenue += net;
        hourOfDay[hour].count += 1;

        totalRevenue += net;
        for (const item of sale.items) {
          totalItems += item.quantity;
          totalCogs +=
            item.quantity * Number(item.variation.product.costPrice ?? 0);
        }
      }

      const monthlyAggregates = Object.entries(monthlyMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, v]) => ({ month, ...v }));

      // Growth rates
      const growthRates = monthlyAggregates.map((m, i) => {
        if (i === 0) return { month: m.month, growthPct: 0 };
        const prev = monthlyAggregates[i - 1].net;
        return {
          month: m.month,
          growthPct: prev > 0 ? +(((m.net - prev) / prev) * 100).toFixed(1) : 0,
        };
      });

      const salesCount = salesWithItems.length;
      const avgBasketSize =
        salesCount > 0 ? +(totalItems / salesCount).toFixed(1) : 0;
      const grossProfit = totalRevenue - totalCogs;
      const grossMargin =
        totalRevenue > 0 ? +((grossProfit / totalRevenue) * 100).toFixed(1) : 0;
      const discountRatio =
        totalRevenue > 0
          ? +(
              (salesWithItems.reduce((s, x) => s + Number(x.discount), 0) /
                salesWithItems.reduce((s, x) => s + Number(x.subtotal), 0)) *
              100
            ).toFixed(1)
          : 0;

      const distinctMembers = memberSalesAgg.length;
      const memberRevenue = memberSalesAgg.reduce(
        (s, m) => s + Number(m._sum.total ?? 0),
        0,
      );
      const revenuePerMember =
        distinctMembers > 0 ? Math.round(memberRevenue / distinctMembers) : 0;

      res.status(200).json({
        message: "Sales extended analytics fetched",
        data: {
          monthlyAggregates,
          growthRates,
          basketMetrics: { avgBasketSize, totalItems, totalSales: salesCount },
          dayOfWeek: dayOfWeek.map((d, i) => ({ day: dayNames[i], ...d })),
          hourOfDay: hourOfDay.map((h, i) => ({ hour: i, ...h })),
          grossProfit,
          grossMargin,
          revenuePerMember,
          discountRatio,
        },
      });
    } catch (error: unknown) {
      console.error("Get sales extended error:", error);
      res.status(500).json({
        message: "Error fetching sales extended analytics",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Product Insights: ABC classification, sell-through, co-purchase, revenue by category.
   */
  async getProductInsights(req: Request, res: Response) {
    try {
      const role = (req as any).user?.role as string | undefined;
      const currentUserId = (req as any).user?.id as string | undefined;
      const { where } = getSalesWhereForAnalytics(
        req.query,
        role,
        currentUserId,
      );

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

      // Aggregate by product
      const productMap: Record<
        string,
        {
          name: string;
          revenue: number;
          quantity: number;
          cost: number;
          categoryId: string;
          categoryName: string;
        }
      > = {};
      for (const item of saleItemsRaw) {
        const pid = item.variation.product.id;
        if (!productMap[pid]) {
          productMap[pid] = {
            name: item.variation.product.name,
            revenue: 0,
            quantity: 0,
            cost: 0,
            categoryId: item.variation.product.categoryId,
            categoryName: item.variation.product.category?.name ?? "Other",
          };
        }
        productMap[pid].revenue += Number(item.lineTotal);
        productMap[pid].quantity += item.quantity;
        productMap[pid].cost +=
          item.quantity * Number(item.variation.product.costPrice ?? 0);
      }

      // ABC classification
      const products = Object.entries(productMap)
        .map(([id, p]) => ({ productId: id, ...p, margin: p.revenue - p.cost }))
        .sort((a, b) => b.revenue - a.revenue);

      const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);
      let cumulative = 0;
      const abcClassification = products.map((p) => {
        cumulative += p.revenue;
        const cumulativePct =
          totalRevenue > 0 ? (cumulative / totalRevenue) * 100 : 0;
        const grade =
          cumulativePct <= 80 ? "A" : cumulativePct <= 95 ? "B" : "C";
        return { ...p, cumulativePct: +cumulativePct.toFixed(1), grade };
      });

      // Sell-through: units sold / (units sold + current stock)
      const stockByVariation: Record<string, number> = {};
      for (const inv of inventoryItems) {
        stockByVariation[inv.variationId] =
          (stockByVariation[inv.variationId] ?? 0) + inv.quantity;
      }
      // Aggregate stock by product
      const soldByProduct: Record<string, number> = {};
      const variationToProduct: Record<string, string> = {};
      for (const item of saleItemsRaw) {
        variationToProduct[item.variationId] = item.variation.product.id;
        soldByProduct[item.variation.product.id] =
          (soldByProduct[item.variation.product.id] ?? 0) + item.quantity;
      }
      const stockByProduct: Record<string, number> = {};
      for (const [vid, qty] of Object.entries(stockByVariation)) {
        const pid = variationToProduct[vid];
        if (pid) stockByProduct[pid] = (stockByProduct[pid] ?? 0) + qty;
      }
      const sellThroughRates = Object.entries(soldByProduct)
        .map(([pid, sold]) => {
          const stock = stockByProduct[pid] ?? 0;
          const rate =
            sold + stock > 0 ? +((sold / (sold + stock)) * 100).toFixed(1) : 0;
          return {
            productId: pid,
            productName: productMap[pid]?.name ?? pid,
            unitsSold: sold,
            currentStock: stock,
            sellThroughRate: rate,
          };
        })
        .sort((a, b) => b.sellThroughRate - a.sellThroughRate);

      // Co-purchase pairs (top 20)
      const salePairs: Record<string, number> = {};
      const saleItemsGrouped: Record<string, string[]> = {};
      for (const item of saleItemsRaw) {
        const pid = item.variation.product.id;
        if (!saleItemsGrouped[item.saleId]) saleItemsGrouped[item.saleId] = [];
        if (!saleItemsGrouped[item.saleId].includes(pid))
          saleItemsGrouped[item.saleId].push(pid);
      }
      for (const prods of Object.values(saleItemsGrouped)) {
        for (let i = 0; i < prods.length; i++) {
          for (let j = i + 1; j < prods.length; j++) {
            const key = [prods[i], prods[j]].sort().join("|");
            salePairs[key] = (salePairs[key] ?? 0) + 1;
          }
        }
      }
      const coPurchasePairs = Object.entries(salePairs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([key, count]) => {
          const [p1, p2] = key.split("|");
          return {
            product1: { id: p1, name: productMap[p1]?.name ?? p1 },
            product2: { id: p2, name: productMap[p2]?.name ?? p2 },
            frequency: count,
          };
        });

      // Revenue by category
      const catMap: Record<
        string,
        { revenue: number; cost: number; quantity: number }
      > = {};
      for (const p of Object.values(productMap)) {
        if (!catMap[p.categoryName])
          catMap[p.categoryName] = { revenue: 0, cost: 0, quantity: 0 };
        catMap[p.categoryName].revenue += p.revenue;
        catMap[p.categoryName].cost += p.cost;
        catMap[p.categoryName].quantity += p.quantity;
      }
      const revenueByCategory = Object.entries(catMap)
        .map(([name, v]) => ({
          category: name,
          ...v,
          margin: v.revenue - v.cost,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      res.status(200).json({
        message: "Product insights fetched",
        data: {
          abcClassification,
          sellThroughRates,
          coPurchasePairs,
          revenueByCategory,
        },
      });
    } catch (error: unknown) {
      console.error("Get product insights error:", error);
      res.status(500).json({
        message: "Error fetching product insights",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Inventory Extended: turnover ratio, DOH, stock-to-sales, dead stock, sell-through by location.
   */
  async getInventoryExtended(req: Request, res: Response) {
    try {
      const role = (req as any).user?.role as string | undefined;
      const currentUserId = (req as any).user?.id as string | undefined;
      const { filters, where } = getSalesWhereForAnalytics(
        req.query,
        role,
        currentUserId,
      );

      const dateFrom = filters.dateFrom
        ? new Date(filters.dateFrom)
        : undefined;
      const dateTo = filters.dateTo
        ? (() => {
            const d = new Date(filters.dateTo!);
            d.setHours(23, 59, 59, 999);
            return d;
          })()
        : undefined;

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

      // Days in period for daily rate calculation
      const now = new Date();
      const start = dateFrom ?? new Date(now.getFullYear(), now.getMonth(), 1);
      const end = dateTo ?? now;
      const daysInPeriod = Math.max(
        1,
        Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)),
      );

      // Aggregate stock by product
      const stockByProduct: Record<
        string,
        { qty: number; costValue: number; name: string }
      > = {};
      for (const inv of inventoryItems) {
        const pid = inv.variation.product.id;
        const cost = Number(inv.variation.product.costPrice ?? 0);
        if (!stockByProduct[pid])
          stockByProduct[pid] = {
            qty: 0,
            costValue: 0,
            name: inv.variation.product.name,
          };
        stockByProduct[pid].qty += inv.quantity;
        stockByProduct[pid].costValue += inv.quantity * cost;
      }

      // Aggregate sold by product
      const soldByProduct: Record<
        string,
        { qty: number; cogs: number; revenue: number }
      > = {};
      for (const item of saleItems) {
        const pid = item.variation.product.id;
        if (!soldByProduct[pid])
          soldByProduct[pid] = { qty: 0, cogs: 0, revenue: 0 };
        soldByProduct[pid].qty += item.quantity;
        soldByProduct[pid].cogs +=
          item.quantity * Number(item.variation.product.costPrice ?? 0);
        soldByProduct[pid].revenue += Number(item.lineTotal);
      }

      // Inventory turnover = COGS / avg inventory cost
      const totalCogs = Object.values(soldByProduct).reduce(
        (s, p) => s + p.cogs,
        0,
      );
      const totalInventoryCost = Object.values(stockByProduct).reduce(
        (s, p) => s + p.costValue,
        0,
      );
      const turnoverRatio =
        totalInventoryCost > 0
          ? +(totalCogs / totalInventoryCost).toFixed(2)
          : 0;

      // Stock-to-sales ratio
      const totalSalesValue = Object.values(soldByProduct).reduce(
        (s, p) => s + p.revenue,
        0,
      );
      const stockToSalesRatio =
        totalSalesValue > 0
          ? +(totalInventoryCost / totalSalesValue).toFixed(2)
          : 0;

      // Days of inventory on hand per product (top 20 slowest)
      const daysOnHand = Object.entries(stockByProduct)
        .map(([pid, stock]) => {
          const sold = soldByProduct[pid]?.qty ?? 0;
          const dailyRate = sold / daysInPeriod;
          const doh =
            dailyRate > 0
              ? Math.round(stock.qty / dailyRate)
              : stock.qty > 0
                ? 999
                : 0;
          return {
            productId: pid,
            productName: stock.name,
            currentStock: stock.qty,
            dailySalesRate: +dailyRate.toFixed(1),
            daysOnHand: doh,
          };
        })
        .filter((p) => p.currentStock > 0)
        .sort((a, b) => b.daysOnHand - a.daysOnHand)
        .slice(0, 20);

      // Dead stock: products with stock > 0 but zero sales in period
      const deadStock = Object.entries(stockByProduct)
        .filter(([pid, stock]) => stock.qty > 0 && !soldByProduct[pid])
        .map(([pid, stock]) => ({
          productId: pid,
          productName: stock.name,
          currentStock: stock.qty,
          stockValue: stock.costValue,
        }))
        .sort((a, b) => b.stockValue - a.stockValue);

      // Sell-through by location
      const soldByLocation: Record<string, number> = {};
      const stockByLocation: Record<string, number> = {};
      for (const item of saleItems) {
        const lid = (item.sale as { locationId: string }).locationId;
        soldByLocation[lid] = (soldByLocation[lid] ?? 0) + item.quantity;
      }
      for (const inv of inventoryItems) {
        stockByLocation[inv.location.id] =
          (stockByLocation[inv.location.id] ?? 0) + inv.quantity;
      }
      const locationMap = Object.fromEntries(
        locations.map((l) => [l.id, l.name]),
      );
      const sellThroughByLocation = Object.keys({
        ...soldByLocation,
        ...stockByLocation,
      }).map((lid) => {
        const sold = soldByLocation[lid] ?? 0;
        const stock = stockByLocation[lid] ?? 0;
        const rate =
          sold + stock > 0 ? +((sold / (sold + stock)) * 100).toFixed(1) : 0;
        return {
          locationId: lid,
          locationName: locationMap[lid] ?? lid,
          unitsSold: sold,
          currentStock: stock,
          sellThroughRate: rate,
        };
      });

      res.status(200).json({
        message: "Inventory extended analytics fetched",
        data: {
          turnoverRatio,
          stockToSalesRatio,
          daysOnHand,
          deadStock,
          sellThroughByLocation,
        },
      });
    } catch (error: unknown) {
      console.error("Get inventory extended error:", error);
      res.status(500).json({
        message: "Error fetching inventory extended analytics",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Customer Insights: CLV, retention/churn, RFM, order frequency, member growth.
   */
  async getCustomerInsights(req: Request, res: Response) {
    try {
      const role = (req as any).user?.role as string | undefined;
      const currentUserId = (req as any).user?.id as string | undefined;
      const { filters, where } = getSalesWhereForAnalytics(
        req.query,
        role,
        currentUserId,
      );

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

      const now = new Date();
      // CLV distribution
      const clvValues = membersWithSales
        .map((m) => Number(m.totalSales ?? 0))
        .filter((v) => v > 0);
      const avgClv =
        clvValues.length > 0
          ? Math.round(clvValues.reduce((a, b) => a + b, 0) / clvValues.length)
          : 0;
      // Histogram buckets
      const clvBuckets = [
        { range: "0-1K", min: 0, max: 1000, count: 0 },
        { range: "1K-5K", min: 1000, max: 5000, count: 0 },
        { range: "5K-10K", min: 5000, max: 10000, count: 0 },
        { range: "10K-25K", min: 10000, max: 25000, count: 0 },
        { range: "25K-50K", min: 25000, max: 50000, count: 0 },
        { range: "50K+", min: 50000, max: Infinity, count: 0 },
      ];
      for (const v of clvValues) {
        const bucket = clvBuckets.find((b) => v >= b.min && v < b.max);
        if (bucket) bucket.count += 1;
      }

      // RFM segmentation
      const rfmData = membersWithSales
        .filter((m) => m.sales.length > 0)
        .map((m) => {
          const lastSale = m.sales[m.sales.length - 1];
          const recencyDays = Math.floor(
            (now.getTime() - lastSale.createdAt.getTime()) /
              (24 * 60 * 60 * 1000),
          );
          const frequency = m.sales.length;
          const monetary = m.sales.reduce(
            (s, sale) => s + Number(sale.total),
            0,
          );
          return { memberId: m.id, recencyDays, frequency, monetary };
        });

      // Score RFM (quintiles)
      const scoreQuintile = (
        arr: number[],
        val: number,
        inverse = false,
      ): number => {
        const sorted = [...arr].sort((a, b) => a - b);
        const idx = sorted.findIndex((v) => v >= val);
        const pct = idx >= 0 ? idx / sorted.length : 1;
        const score = Math.min(5, Math.max(1, Math.ceil(pct * 5)));
        return inverse ? 6 - score : score;
      };

      const recencyArr = rfmData.map((r) => r.recencyDays);
      const freqArr = rfmData.map((r) => r.frequency);
      const monArr = rfmData.map((r) => r.monetary);

      const rfmSegments: Record<string, { count: number; revenue: number }> =
        {};
      for (const r of rfmData) {
        const rScore = scoreQuintile(recencyArr, r.recencyDays, true); // lower recency = higher score
        const fScore = scoreQuintile(freqArr, r.frequency);
        const mScore = scoreQuintile(monArr, r.monetary);
        let segment: string;
        const avg = (rScore + fScore + mScore) / 3;
        if (rScore >= 4 && fScore >= 4) segment = "Champions";
        else if (rScore >= 3 && fScore >= 3) segment = "Loyal";
        else if (rScore >= 4 && fScore <= 2) segment = "New Customers";
        else if (rScore <= 2 && fScore >= 3) segment = "At Risk";
        else if (rScore <= 2 && fScore <= 2) segment = "Lost";
        else if (avg >= 3.5) segment = "Potential Loyalists";
        else segment = "Need Attention";

        if (!rfmSegments[segment])
          rfmSegments[segment] = { count: 0, revenue: 0 };
        rfmSegments[segment].count += 1;
        rfmSegments[segment].revenue += r.monetary;
      }

      // Average order frequency (days between purchases)
      const frequencies: number[] = [];
      for (const m of membersWithSales) {
        if (m.sales.length < 2) continue;
        for (let i = 1; i < m.sales.length; i++) {
          const diff =
            (m.sales[i].createdAt.getTime() -
              m.sales[i - 1].createdAt.getTime()) /
            (24 * 60 * 60 * 1000);
          frequencies.push(diff);
        }
      }
      const avgOrderFrequencyDays =
        frequencies.length > 0
          ? Math.round(
              frequencies.reduce((a, b) => a + b, 0) / frequencies.length,
            )
          : 0;

      // Member growth over time (by month)
      const memberGrowthMap: Record<string, number> = {};
      for (const m of allMembers) {
        const key = m.createdAt.toISOString().slice(0, 7);
        memberGrowthMap[key] = (memberGrowthMap[key] ?? 0) + 1;
      }
      const memberGrowth = Object.entries(memberGrowthMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, count]) => ({ month, count }));

      // Retention/churn: members active in previous period vs current
      const dateFrom = filters.dateFrom
        ? new Date(filters.dateFrom)
        : undefined;
      const dateTo = filters.dateTo
        ? (() => {
            const d = new Date(filters.dateTo!);
            d.setHours(23, 59, 59, 999);
            return d;
          })()
        : undefined;

      let retentionRate = 0;
      let churnRate = 0;
      if (dateFrom && dateTo) {
        const periodMs = dateTo.getTime() - dateFrom.getTime();
        const prevStart = new Date(dateFrom.getTime() - periodMs);
        const prevEnd = new Date(dateFrom.getTime() - 1);

        const prevPeriodMembers = new Set(
          membersWithSales
            .filter((m) =>
              m.sales.some(
                (s) => s.createdAt >= prevStart && s.createdAt <= prevEnd,
              ),
            )
            .map((m) => m.id),
        );
        const currentPeriodMembers = new Set(
          membersWithSales
            .filter((m) =>
              m.sales.some(
                (s) => s.createdAt >= dateFrom && s.createdAt <= dateTo,
              ),
            )
            .map((m) => m.id),
        );
        const retained = [...prevPeriodMembers].filter((id) =>
          currentPeriodMembers.has(id),
        ).length;
        retentionRate =
          prevPeriodMembers.size > 0
            ? +((retained / prevPeriodMembers.size) * 100).toFixed(1)
            : 0;
        churnRate = +(100 - retentionRate).toFixed(1);
      }

      // New vs returning revenue over time
      const newVsReturningMap: Record<
        string,
        { newRevenue: number; returningRevenue: number }
      > = {};
      const memberFirstSale: Record<string, string> = {};
      for (const m of membersWithSales) {
        if (m.sales.length > 0) {
          memberFirstSale[m.id] = m.sales[0].createdAt
            .toISOString()
            .slice(0, 7);
        }
      }
      for (const m of membersWithSales) {
        for (const sale of m.sales) {
          const monthKey = sale.createdAt.toISOString().slice(0, 7);
          if (!newVsReturningMap[monthKey])
            newVsReturningMap[monthKey] = {
              newRevenue: 0,
              returningRevenue: 0,
            };
          if (memberFirstSale[m.id] === monthKey) {
            newVsReturningMap[monthKey].newRevenue += Number(sale.total);
          } else {
            newVsReturningMap[monthKey].returningRevenue += Number(sale.total);
          }
        }
      }
      const newVsReturningTimeSeries = Object.entries(newVsReturningMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, v]) => ({ month, ...v }));

      res.status(200).json({
        message: "Customer insights fetched",
        data: {
          clvDistribution: clvBuckets.map((b) => ({
            range: b.range,
            count: b.count,
          })),
          avgClv,
          retentionRate,
          churnRate,
          rfmSegments: Object.entries(rfmSegments).map(([segment, v]) => ({
            segment,
            ...v,
          })),
          avgOrderFrequencyDays,
          memberGrowth,
          newVsReturningTimeSeries,
        },
      });
    } catch (error: unknown) {
      console.error("Get customer insights error:", error);
      res.status(500).json({
        message: "Error fetching customer insights",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Trends: monthly totals, seasonality, cohort retention, peak hours (7x24).
   */
  async getTrends(req: Request, res: Response) {
    try {
      const role = (req as any).user?.role as string | undefined;
      const currentUserId = (req as any).user?.id as string | undefined;
      const { where } = getSalesWhereForAnalytics(
        req.query,
        role,
        currentUserId,
      );

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

      // Monthly totals
      const monthlyMap: Record<
        string,
        { revenue: number; count: number; discount: number }
      > = {};
      // Peak hours grid: dayOfWeek x hourOfDay
      const peakHours: number[][] = Array.from({ length: 7 }, () =>
        Array(24).fill(0),
      );

      for (const sale of sales) {
        const d = sale.createdAt;
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!monthlyMap[monthKey])
          monthlyMap[monthKey] = { revenue: 0, count: 0, discount: 0 };
        monthlyMap[monthKey].revenue += Number(sale.total);
        monthlyMap[monthKey].count += 1;
        monthlyMap[monthKey].discount += Number(sale.discount);

        peakHours[d.getDay()][d.getHours()] += Number(sale.total);
      }

      const monthlyTotals = Object.entries(monthlyMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, v], i, arr) => {
          const prev = i > 0 ? arr[i - 1][1].revenue : 0;
          const momGrowth =
            prev > 0 ? +(((v.revenue - prev) / prev) * 100).toFixed(1) : 0;
          return { month, ...v, momGrowth };
        });

      // Seasonality index: month avg / overall avg * 100
      const overallAvg =
        monthlyTotals.length > 0
          ? monthlyTotals.reduce((s, m) => s + m.revenue, 0) /
            monthlyTotals.length
          : 0;
      const seasonalityIndex = monthlyTotals.map((m) => ({
        month: m.month,
        index:
          overallAvg > 0 ? +((m.revenue / overallAvg) * 100).toFixed(0) : 100,
      }));

      // Cohort retention matrix: members grouped by first purchase month
      const cohortMap: Record<string, Set<string>[]> = {};
      for (const m of membersWithSales) {
        if (m.sales.length === 0) continue;
        const firstMonth = m.sales[0].createdAt.toISOString().slice(0, 7);
        if (!cohortMap[firstMonth]) cohortMap[firstMonth] = [];

        for (const sale of m.sales) {
          const saleMonth = sale.createdAt.toISOString().slice(0, 7);
          const monthDiff = monthDifference(firstMonth, saleMonth);
          while (cohortMap[firstMonth].length <= monthDiff)
            cohortMap[firstMonth].push(new Set());
          cohortMap[firstMonth][monthDiff].add(m.id);
        }
      }
      const cohortRetention = Object.entries(cohortMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, sets]) => ({
          cohortMonth: month,
          size: sets[0]?.size ?? 0,
          retention: sets.map((s, i) => ({
            monthOffset: i,
            activeCount: s.size,
            rate:
              sets[0].size > 0
                ? +((s.size / sets[0].size) * 100).toFixed(0)
                : 0,
          })),
        }));

      // Peak hours: format as array for heatmap
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const peakHoursFormatted = peakHours.map((hours, dayIdx) => ({
        day: dayNames[dayIdx],
        hours: hours.map((revenue, hour) => ({
          hour,
          revenue: Math.round(revenue),
        })),
      }));

      res.status(200).json({
        message: "Trends analytics fetched",
        data: {
          monthlyTotals,
          seasonalityIndex,
          cohortRetention,
          peakHours: peakHoursFormatted,
        },
      });
    } catch (error: unknown) {
      console.error("Get trends error:", error);
      res.status(500).json({
        message: "Error fetching trends analytics",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Financial: gross profit over time, COGS by category/location, discount ratio, margin by category.
   */
  async getFinancial(req: Request, res: Response) {
    try {
      const role = (req as any).user?.role as string | undefined;
      const currentUserId = (req as any).user?.id as string | undefined;
      const { where } = getSalesWhereForAnalytics(
        req.query,
        role,
        currentUserId,
      );

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
              createdAt: true,
              locationId: true,
              discount: true,
              subtotal: true,
              total: true,
            },
          },
        },
      });

      // Group by date for gross profit time series
      const dailyMap: Record<
        string,
        { revenue: number; cogs: number; discount: number; subtotal: number }
      > = {};
      const categoryMap: Record<string, { revenue: number; cogs: number }> = {};
      const locationCogsMap: Record<string, number> = {};

      for (const item of saleItems) {
        const d = (item.sale as { createdAt: Date }).createdAt
          .toISOString()
          .slice(0, 10);
        const cost =
          item.quantity * Number(item.variation.product.costPrice ?? 0);
        const revenue = Number(item.lineTotal);
        const catName = item.variation.product.category?.name ?? "Other";
        const lid = (item.sale as { locationId: string }).locationId;

        if (!dailyMap[d])
          dailyMap[d] = { revenue: 0, cogs: 0, discount: 0, subtotal: 0 };
        dailyMap[d].revenue += revenue;
        dailyMap[d].cogs += cost;

        if (!categoryMap[catName])
          categoryMap[catName] = { revenue: 0, cogs: 0 };
        categoryMap[catName].revenue += revenue;
        categoryMap[catName].cogs += cost;

        locationCogsMap[lid] = (locationCogsMap[lid] ?? 0) + cost;
      }

      // Add discount/subtotal per unique sale (avoid double counting)
      const processedSales = new Set<string>();
      for (const item of saleItems) {
        const sale = item.sale as {
          createdAt: Date;
          discount: number;
          subtotal: number;
          total: number;
        };
        const d = sale.createdAt.toISOString().slice(0, 10);
        const saleKey = `${d}-${Number(sale.subtotal)}-${Number(sale.total)}`;
        if (!processedSales.has(saleKey)) {
          processedSales.add(saleKey);
          if (dailyMap[d]) {
            dailyMap[d].discount += Number(sale.discount);
            dailyMap[d].subtotal += Number(sale.subtotal);
          }
        }
      }

      const grossProfitTimeSeries = Object.entries(dailyMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, v]) => ({
          date,
          revenue: v.revenue,
          cogs: v.cogs,
          grossProfit: v.revenue - v.cogs,
          discountRatio:
            v.subtotal > 0 ? +((v.discount / v.subtotal) * 100).toFixed(1) : 0,
        }));

      const cogsByCategory = Object.entries(categoryMap)
        .map(([category, v]) => ({
          category,
          cogs: v.cogs,
          revenue: v.revenue,
        }))
        .sort((a, b) => b.cogs - a.cogs);

      const locationIds = Object.keys(locationCogsMap);
      const locations =
        locationIds.length > 0
          ? await prisma.location.findMany({
              where: { id: { in: locationIds } },
              select: { id: true, name: true },
            })
          : [];
      const locMap = Object.fromEntries(locations.map((l) => [l.id, l.name]));

      const cogsByLocation = Object.entries(locationCogsMap)
        .map(([lid, cogs]) => ({
          locationId: lid,
          locationName: locMap[lid] ?? lid,
          cogs,
        }))
        .sort((a, b) => b.cogs - a.cogs);

      const marginByCategory = Object.entries(categoryMap)
        .map(([category, v]) => ({
          category,
          revenue: v.revenue,
          cogs: v.cogs,
          margin: v.revenue - v.cogs,
          marginPct:
            v.revenue > 0
              ? +(((v.revenue - v.cogs) / v.revenue) * 100).toFixed(1)
              : 0,
        }))
        .sort((a, b) => b.marginPct - a.marginPct);

      res.status(200).json({
        message: "Financial analytics fetched",
        data: {
          grossProfitTimeSeries,
          cogsByCategory,
          cogsByLocation,
          marginByCategory,
        },
      });
    } catch (error: unknown) {
      console.error("Get financial error:", error);
      res.status(500).json({
        message: "Error fetching financial analytics",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Export analytics data as CSV or Excel.
   * Query: type=sales-revenue|inventory-ops|customers-promos|trends|financial, format=csv|excel
   */
  async exportAnalytics(req: Request, res: Response) {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const exportType = req.query.type as string;
      const format = (req.query.format as string) || "csv";
      const role = (req as any).user?.role as string | undefined;
      const currentUserId = (req as any).user?.id as string | undefined;
      const { where } = getSalesWhereForAnalytics(
        req.query,
        role,
        currentUserId,
      );

      const workbook = new ExcelJS.Workbook();
      const timestamp = new Date().toISOString().split("T")[0];

      if (exportType === "sales-revenue" || exportType === "sales-extended") {
        const sales = await prisma.sale.findMany({
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

        const ws = workbook.addWorksheet("Sales Revenue");
        ws.columns = [
          { header: "Date", key: "date", width: 12 },
          { header: "Sale Code", key: "saleCode", width: 16 },
          { header: "Type", key: "type", width: 10 },
          { header: "Location", key: "location", width: 18 },
          { header: "User", key: "user", width: 14 },
          { header: "Subtotal", key: "subtotal", width: 14 },
          { header: "Discount", key: "discount", width: 12 },
          { header: "Total", key: "total", width: 14 },
          { header: "Items", key: "items", width: 8 },
        ];
        ws.getRow(1).font = { bold: true };

        for (const s of sales) {
          ws.addRow({
            date: s.createdAt.toISOString().slice(0, 10),
            saleCode: s.saleCode,
            type: s.type,
            location: s.location.name,
            user: s.createdBy.username,
            subtotal: Number(s.subtotal),
            discount: Number(s.discount),
            total: Number(s.total),
            items: s.items.reduce((acc, i) => acc + i.quantity, 0),
          });
        }
      } else if (exportType === "inventory-ops") {
        const invItems = await prisma.locationInventory.findMany({
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
        const ws = workbook.addWorksheet("Inventory");
        ws.columns = [
          { header: "Product", key: "product", width: 24 },
          { header: "Category", key: "category", width: 16 },
          { header: "Location", key: "location", width: 16 },
          { header: "Quantity", key: "quantity", width: 10 },
          { header: "Cost Price", key: "costPrice", width: 12 },
          { header: "MRP", key: "mrp", width: 12 },
          { header: "Stock Value (Cost)", key: "stockValueCost", width: 16 },
          { header: "Stock Value (MRP)", key: "stockValueMrp", width: 16 },
        ];
        ws.getRow(1).font = { bold: true };
        for (const inv of invItems) {
          const cost = Number(inv.variation.product.costPrice ?? 0);
          const mrp = Number(inv.variation.product.mrp ?? 0);
          ws.addRow({
            product: inv.variation.product.name,
            category: inv.variation.product.category?.name ?? "",
            location: inv.location.name,
            quantity: inv.quantity,
            costPrice: cost,
            mrp,
            stockValueCost: inv.quantity * cost,
            stockValueMrp: inv.quantity * mrp,
          });
        }
      } else if (exportType === "customers-promos") {
        const filters = parseAnalyticsFilters(
          req.query as Record<string, unknown>,
        );
        const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
        const dateTo = filters.dateTo
          ? (() => {
              const d = new Date(filters.dateTo);
              d.setHours(23, 59, 59, 999);
              return d;
            })()
          : null;
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
            where: { ...where, memberId: { not: null } },
            _count: true,
          }),
          prisma.saleItem.groupBy({
            by: ["variationId"],
            where: { sale: where },
            _sum: { lineTotal: true, quantity: true },
            _count: true,
          }),
          prisma.promoCode.findMany({
            where: { isActive: true },
            select: { code: true, usageCount: true, value: true },
          }),
        ]);
        const repeatCount = membersWithSales.filter((m) => m._count > 1).length;
        const memberIdsSize = new Set(
          membersWithSales.map((m) => m.memberId).filter(Boolean),
        ).size;
        const repeatPercent =
          memberIdsSize > 0 ? (repeatCount / memberIdsSize) * 100 : 0;
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
        const productPerf = productPerformanceRaw.map((p) => {
          const v = variations.find((x) => x.id === p.variationId);
          const cost = v ? Number(v.product.costPrice ?? 0) : 0;
          const revenue = Number(p._sum.lineTotal ?? 0);
          const qty = Number(p._sum.quantity ?? 0) || p._count;
          return {
            productName: v?.product.name ?? p.variationId,
            revenue,
            quantity: qty,
            margin: revenue - qty * cost,
          };
        });

        const summaryWs = workbook.addWorksheet("Summary", {
          firstSheet: true,
        });
        summaryWs.addRow(["Report", "Customers & Promotions"]);
        summaryWs.addRow(["Total Members", memberCount]);
        summaryWs.addRow(["New in Period", newMembersInPeriod]);
        summaryWs.addRow(["Repeat %", repeatPercent.toFixed(1) + "%"]);
        summaryWs.getRow(1).font = { bold: true };

        const perfWs = workbook.addWorksheet("Product Performance");
        perfWs.columns = [
          { header: "Product", key: "productName", width: 28 },
          { header: "Revenue", key: "revenue", width: 14 },
          { header: "Quantity", key: "quantity", width: 10 },
          { header: "Margin", key: "margin", width: 14 },
        ];
        perfWs.getRow(1).font = { bold: true };
        productPerf.forEach((r) => perfWs.addRow(r));

        const promoWs = workbook.addWorksheet("Promo Effectiveness");
        promoWs.columns = [
          { header: "Code", key: "code", width: 16 },
          { header: "Usage Count", key: "usageCount", width: 12 },
          { header: "Value", key: "value", width: 12 },
        ];
        promoWs.getRow(1).font = { bold: true };
        promoCodes.forEach((c) =>
          promoWs.addRow({
            code: c.code,
            usageCount: c.usageCount,
            value: Number(c.value),
          }),
        );
      } else if (exportType === "trends") {
        const sales = await prisma.sale.findMany({
          where,
          select: { total: true, discount: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        });
        const membersWithSales = await prisma.member.findMany({
          select: {
            id: true,
            sales: {
              where,
              select: { createdAt: true },
              orderBy: { createdAt: "asc" },
            },
          },
        });
        const monthlyMap: Record<
          string,
          { revenue: number; count: number; discount: number }
        > = {};
        const peakHours: number[][] = Array.from({ length: 7 }, () =>
          Array(24).fill(0),
        );
        for (const sale of sales) {
          const d = sale.createdAt;
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (!monthlyMap[monthKey])
            monthlyMap[monthKey] = { revenue: 0, count: 0, discount: 0 };
          monthlyMap[monthKey].revenue += Number(sale.total);
          monthlyMap[monthKey].count += 1;
          monthlyMap[monthKey].discount += Number(sale.discount);
          peakHours[d.getDay()][d.getHours()] += Number(sale.total);
        }
        const monthlyTotals = Object.entries(monthlyMap)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([month, v], i, arr) => {
            const prev = i > 0 ? arr[i - 1][1].revenue : 0;
            const momGrowth =
              prev > 0 ? +(((v.revenue - prev) / prev) * 100).toFixed(1) : 0;
            return {
              month,
              revenue: v.revenue,
              count: v.count,
              discount: v.discount,
              momGrowth,
            };
          });
        const overallAvg =
          monthlyTotals.length > 0
            ? monthlyTotals.reduce((s, m) => s + m.revenue, 0) /
              monthlyTotals.length
            : 0;
        const seasonalityIndex = monthlyTotals.map((m) => ({
          month: m.month,
          index:
            overallAvg > 0 ? +((m.revenue / overallAvg) * 100).toFixed(0) : 100,
        }));

        const cohortMap: Record<string, Set<string>[]> = {};
        for (const m of membersWithSales) {
          if (m.sales.length === 0) continue;
          const firstMonth = m.sales[0].createdAt.toISOString().slice(0, 7);
          if (!cohortMap[firstMonth]) cohortMap[firstMonth] = [];
          for (const sale of m.sales) {
            const saleMonth = sale.createdAt.toISOString().slice(0, 7);
            const monthDiff = monthDifference(firstMonth, saleMonth);
            while (cohortMap[firstMonth].length <= monthDiff)
              cohortMap[firstMonth].push(new Set());
            cohortMap[firstMonth][monthDiff].add(m.id);
          }
        }
        const cohortRetention = Object.entries(cohortMap)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([cohortMonth, sets]) => ({
            cohortMonth,
            size: sets[0]?.size ?? 0,
            retention: sets.map((s, i) =>
              sets[0].size > 0
                ? +((s.size / sets[0].size) * 100).toFixed(0)
                : 0,
            ),
          }));

        const summaryWs = workbook.addWorksheet("Summary", {
          firstSheet: true,
        });
        summaryWs.addRow(["Report", "Trends & Patterns"]);
        summaryWs.addRow(["Months", monthlyTotals.length]);
        summaryWs.getRow(1).font = { bold: true };

        const monthlyWs = workbook.addWorksheet("Monthly Totals");
        monthlyWs.columns = [
          { header: "Month", key: "month", width: 12 },
          { header: "Revenue", key: "revenue", width: 14 },
          { header: "Count", key: "count", width: 10 },
          { header: "Discount", key: "discount", width: 12 },
          { header: "MoM %", key: "momGrowth", width: 10 },
        ];
        monthlyWs.getRow(1).font = { bold: true };
        monthlyTotals.forEach((r) => monthlyWs.addRow(r));

        const seasonWs = workbook.addWorksheet("Seasonality");
        seasonWs.columns = [
          { header: "Month", key: "month", width: 12 },
          { header: "Index", key: "index", width: 10 },
        ];
        seasonWs.getRow(1).font = { bold: true };
        seasonalityIndex.forEach((r) => seasonWs.addRow(r));

        const cohortWs = workbook.addWorksheet("Cohort Retention");
        const maxRet = Math.max(
          0,
          ...cohortRetention.map((c) => c.retention.length),
        );
        cohortWs.addRow([
          "Cohort",
          "Size",
          ...Array.from({ length: maxRet }, (_, i) => `M+${i}`),
        ]);
        cohortWs.getRow(1).font = { bold: true };
        cohortRetention.forEach((c) =>
          cohortWs.addRow([c.cohortMonth, c.size, ...c.retention]),
        );

        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const peakWs = workbook.addWorksheet("Peak Hours");
        peakWs.addRow([
          "Day",
          ...Array.from({ length: 24 }, (_, h) => h.toString()),
        ]);
        peakWs.getRow(1).font = { bold: true };
        peakHours.forEach((hours, dayIdx) =>
          peakWs.addRow([dayNames[dayIdx], ...hours]),
        );
      } else if (exportType === "financial") {
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
                createdAt: true,
                locationId: true,
                discount: true,
                subtotal: true,
                total: true,
              },
            },
          },
        });
        const dailyMap: Record<
          string,
          { revenue: number; cogs: number; discount: number; subtotal: number }
        > = {};
        const categoryMap: Record<string, { revenue: number; cogs: number }> =
          {};
        const locationCogsMap: Record<string, number> = {};
        for (const item of saleItems) {
          const d = (item.sale as { createdAt: Date }).createdAt
            .toISOString()
            .slice(0, 10);
          const cost =
            item.quantity * Number(item.variation.product.costPrice ?? 0);
          const revenue = Number(item.lineTotal);
          const catName = item.variation.product.category?.name ?? "Other";
          const lid = (item.sale as { locationId: string }).locationId;
          if (!dailyMap[d])
            dailyMap[d] = { revenue: 0, cogs: 0, discount: 0, subtotal: 0 };
          dailyMap[d].revenue += revenue;
          dailyMap[d].cogs += cost;
          if (!categoryMap[catName])
            categoryMap[catName] = { revenue: 0, cogs: 0 };
          categoryMap[catName].revenue += revenue;
          categoryMap[catName].cogs += cost;
          locationCogsMap[lid] = (locationCogsMap[lid] ?? 0) + cost;
        }
        const processedSales = new Set<string>();
        for (const item of saleItems) {
          const sale = item.sale as {
            createdAt: Date;
            discount: number;
            subtotal: number;
            total: number;
          };
          const d = sale.createdAt.toISOString().slice(0, 10);
          const saleKey = `${d}-${Number(sale.subtotal)}-${Number(sale.total)}`;
          if (!processedSales.has(saleKey)) {
            processedSales.add(saleKey);
            if (dailyMap[d]) {
              dailyMap[d].discount += Number(sale.discount);
              dailyMap[d].subtotal += Number(sale.subtotal);
            }
          }
        }
        const grossProfitTimeSeries = Object.entries(dailyMap)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([date, v]) => ({
            date,
            revenue: v.revenue,
            cogs: v.cogs,
            grossProfit: v.revenue - v.cogs,
            discountRatio:
              v.subtotal > 0
                ? +((v.discount / v.subtotal) * 100).toFixed(1)
                : 0,
          }));
        const cogsByCategory = Object.entries(categoryMap)
          .map(([category, v]) => ({
            category,
            cogs: v.cogs,
            revenue: v.revenue,
          }))
          .sort((a, b) => b.cogs - a.cogs);
        const locationIds = Object.keys(locationCogsMap);
        const locations =
          locationIds.length > 0
            ? await prisma.location.findMany({
                where: { id: { in: locationIds } },
                select: { id: true, name: true },
              })
            : [];
        const locMap = Object.fromEntries(locations.map((l) => [l.id, l.name]));
        const cogsByLocation = Object.entries(locationCogsMap)
          .map(([lid, cogs]) => ({ locationName: locMap[lid] ?? lid, cogs }))
          .sort((a, b) => b.cogs - a.cogs);
        const marginByCategory = Object.entries(categoryMap)
          .map(([category, v]) => ({
            category,
            revenue: v.revenue,
            cogs: v.cogs,
            margin: v.revenue - v.cogs,
            marginPct:
              v.revenue > 0
                ? +(((v.revenue - v.cogs) / v.revenue) * 100).toFixed(1)
                : 0,
          }))
          .sort((a, b) => b.marginPct - a.marginPct);

        const summaryWs = workbook.addWorksheet("Summary", {
          firstSheet: true,
        });
        summaryWs.addRow(["Report", "Financial Analytics"]);
        summaryWs.addRow(["Days", grossProfitTimeSeries.length]);
        summaryWs.getRow(1).font = { bold: true };

        const gpWs = workbook.addWorksheet("Gross Profit Over Time");
        gpWs.columns = [
          { header: "Date", key: "date", width: 12 },
          { header: "Revenue", key: "revenue", width: 14 },
          { header: "COGS", key: "cogs", width: 14 },
          { header: "Gross Profit", key: "grossProfit", width: 14 },
          { header: "Discount %", key: "discountRatio", width: 12 },
        ];
        gpWs.getRow(1).font = { bold: true };
        grossProfitTimeSeries.forEach((r) => gpWs.addRow(r));

        const catWs = workbook.addWorksheet("COGS by Category");
        catWs.columns = [
          { header: "Category", key: "category", width: 20 },
          { header: "COGS", key: "cogs", width: 14 },
          { header: "Revenue", key: "revenue", width: 14 },
        ];
        catWs.getRow(1).font = { bold: true };
        cogsByCategory.forEach((r) => catWs.addRow(r));

        const locWs = workbook.addWorksheet("COGS by Location");
        locWs.columns = [
          { header: "Location", key: "locationName", width: 20 },
          { header: "COGS", key: "cogs", width: 14 },
        ];
        locWs.getRow(1).font = { bold: true };
        cogsByLocation.forEach((r) => locWs.addRow(r));

        const marginWs = workbook.addWorksheet("Margin by Category");
        marginWs.columns = [
          { header: "Category", key: "category", width: 20 },
          { header: "Revenue", key: "revenue", width: 14 },
          { header: "COGS", key: "cogs", width: 14 },
          { header: "Margin", key: "margin", width: 14 },
          { header: "Margin %", key: "marginPct", width: 10 },
        ];
        marginWs.getRow(1).font = { bold: true };
        marginByCategory.forEach((r) => marginWs.addRow(r));
      } else {
        return res.status(400).json({ message: "Invalid export type" });
      }

      const ext = format === "excel" ? "xlsx" : "csv";
      const filename = `analytics_${exportType}_${timestamp}.${ext}`;

      if (format === "excel") {
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`,
        );
        const buffer = await workbook.xlsx.writeBuffer();
        res.send(buffer);
      } else {
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`,
        );
        const ws = workbook.worksheets[0];
        if (!ws) return res.status(400).json({ message: "No data to export" });
        const rows: string[] = [];
        ws.eachRow((row) => {
          const vals = (row.values as (string | number | null)[])
            .slice(1)
            .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`);
          rows.push(vals.join(","));
        });
        res.send(rows.join("\n"));
      }
    } catch (error: unknown) {
      console.error("Export analytics error:", error);
      res.status(500).json({
        message: "Error exporting analytics",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Member cohort: new vs repeat customers in period (count and revenue).
   */
  async getMemberCohort(req: Request, res: Response) {
    try {
      const role = (req as any).user?.role as string | undefined;
      const currentUserId = (req as any).user?.id as string | undefined;
      const { where } = getSalesWhereForAnalytics(
        req.query,
        role,
        currentUserId,
      );

      const byMember = await prisma.sale.groupBy({
        by: ["memberId"],
        where: { ...where, memberId: { not: null } },
        _count: true,
        _sum: { total: true },
      });

      let newCount = 0;
      let repeatCount = 0;
      let newRevenue = 0;
      let repeatRevenue = 0;
      for (const row of byMember) {
        const count = row._count;
        const revenue = Number(row._sum.total ?? 0);
        if (count === 1) {
          newCount += 1;
          newRevenue += revenue;
        } else {
          repeatCount += 1;
          repeatRevenue += revenue;
        }
      }

      res.status(200).json({
        message: "Member cohort fetched",
        data: {
          newCount,
          repeatCount,
          newRevenue,
          repeatRevenue,
        },
      });
    } catch (error: unknown) {
      console.error("Get member cohort error:", error);
      res.status(500).json({
        message: "Error fetching member cohort",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export default new AnalyticsController();
