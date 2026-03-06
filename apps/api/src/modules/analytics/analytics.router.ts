import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { enforcePlanFeature } from "@/middlewares/enforcePlanLimits";
import analyticsController from "@/modules/analytics/analytics.controller";
import { analyticsCacheMiddleware } from "@/modules/analytics/analyticsCacheMiddleware";
import { asyncHandler } from "@/middlewares/errorHandler";

const analyticsRouter = Router();

analyticsRouter.use(enforcePlanFeature("analytics"));

/**
 * @swagger
 * /analytics/overview:
 *   get:
 *     summary: Get analytics overview
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string }
 *         description: Filter from date (YYYY-MM-DD or ISO)
 *       - in: query
 *         name: dateTo
 *         schema: { type: string }
 *         description: Filter to date (YYYY-MM-DD or ISO)
 *       - in: query
 *         name: locationIds
 *         schema: { type: string }
 *         description: Comma-separated location UUIDs
 *       - in: query
 *         name: saleType
 *         schema: { type: string, enum: [GENERAL, MEMBER] }
 *       - in: query
 *         name: creditStatus
 *         schema: { type: string, enum: [credit, non-credit] }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string }
 *       - in: query
 *         name: vendorId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Overview metrics
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
analyticsRouter.get(
  "/overview",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(analyticsController.getOverview),
);

/**
 * @swagger
 * /analytics/sales-revenue:
 *   get:
 *     summary: Sales and revenue analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string }
 *       - in: query
 *         name: locationIds
 *         schema: { type: string }
 *         description: Comma-separated location UUIDs
 *       - in: query
 *         name: saleType
 *         schema: { type: string, enum: [GENERAL, MEMBER] }
 *       - in: query
 *         name: creditStatus
 *         schema: { type: string, enum: [credit, non-credit] }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string }
 *       - in: query
 *         name: vendorId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Sales revenue metrics
 */
analyticsRouter.get(
  "/sales-revenue",
  authorizeRoles("user", "admin", "superAdmin"),
  analyticsCacheMiddleware,
  asyncHandler(analyticsController.getSalesRevenue),
);

/**
 * @swagger
 * /analytics/inventory-ops:
 *   get:
 *     summary: Inventory and operations analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string }
 *       - in: query
 *         name: locationIds
 *         schema: { type: string }
 *         description: Comma-separated location UUIDs
 *       - in: query
 *         name: saleType
 *         schema: { type: string, enum: [GENERAL, MEMBER] }
 *       - in: query
 *         name: creditStatus
 *         schema: { type: string, enum: [credit, non-credit] }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string }
 *       - in: query
 *         name: vendorId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Inventory ops metrics
 */
analyticsRouter.get(
  "/inventory-ops",
  authorizeRoles("admin", "superAdmin"),
  analyticsCacheMiddleware,
  asyncHandler(analyticsController.getInventoryOps),
);

/**
 * @swagger
 * /analytics/customers-promos:
 *   get:
 *     summary: Customers and promos analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string }
 *       - in: query
 *         name: locationIds
 *         schema: { type: string }
 *         description: Comma-separated location UUIDs
 *       - in: query
 *         name: saleType
 *         schema: { type: string, enum: [GENERAL, MEMBER] }
 *       - in: query
 *         name: creditStatus
 *         schema: { type: string, enum: [credit, non-credit] }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string }
 *       - in: query
 *         name: vendorId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Customers and promos metrics
 */
analyticsRouter.get(
  "/customers-promos",
  authorizeRoles("admin", "superAdmin"),
  analyticsCacheMiddleware,
  asyncHandler(analyticsController.getCustomersPromos),
);

/**
 * @swagger
 * /analytics/discount:
 *   get:
 *     summary: Discount analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string }
 *       - in: query
 *         name: locationIds
 *         schema: { type: string }
 *         description: Comma-separated location UUIDs
 *       - in: query
 *         name: saleType
 *         schema: { type: string, enum: [GENERAL, MEMBER] }
 *       - in: query
 *         name: creditStatus
 *         schema: { type: string, enum: [credit, non-credit] }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string }
 *       - in: query
 *         name: vendorId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Discount metrics
 */
analyticsRouter.get(
  "/discount",
  authorizeRoles("user", "admin", "superAdmin"),
  analyticsCacheMiddleware,
  asyncHandler(analyticsController.getDiscountAnalytics),
);

/**
 * @swagger
 * /analytics/payment-trends:
 *   get:
 *     summary: Payment method trends
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string }
 *       - in: query
 *         name: locationIds
 *         schema: { type: string }
 *         description: Comma-separated location UUIDs
 *       - in: query
 *         name: saleType
 *         schema: { type: string, enum: [GENERAL, MEMBER] }
 *       - in: query
 *         name: creditStatus
 *         schema: { type: string, enum: [credit, non-credit] }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string }
 *       - in: query
 *         name: vendorId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payment trends
 */
analyticsRouter.get(
  "/payment-trends",
  authorizeRoles("user", "admin", "superAdmin"),
  analyticsCacheMiddleware,
  asyncHandler(analyticsController.getPaymentTrends),
);

/**
 * @swagger
 * /analytics/location-comparison:
 *   get:
 *     summary: Location comparison
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string }
 *       - in: query
 *         name: locationIds
 *         schema: { type: string }
 *         description: Comma-separated location UUIDs
 *       - in: query
 *         name: saleType
 *         schema: { type: string, enum: [GENERAL, MEMBER] }
 *       - in: query
 *         name: creditStatus
 *         schema: { type: string, enum: [credit, non-credit] }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string }
 *       - in: query
 *         name: vendorId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Location comparison metrics
 */
analyticsRouter.get(
  "/location-comparison",
  authorizeRoles("user", "admin", "superAdmin"),
  analyticsCacheMiddleware,
  asyncHandler(analyticsController.getLocationComparison),
);

/**
 * @swagger
 * /analytics/member-cohort:
 *   get:
 *     summary: Member cohort (new vs repeat)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string }
 *       - in: query
 *         name: locationIds
 *         schema: { type: string }
 *         description: Comma-separated location UUIDs
 *       - in: query
 *         name: saleType
 *         schema: { type: string, enum: [GENERAL, MEMBER] }
 *       - in: query
 *         name: creditStatus
 *         schema: { type: string, enum: [credit, non-credit] }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string }
 *       - in: query
 *         name: vendorId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Member cohort metrics
 */
analyticsRouter.get(
  "/member-cohort",
  authorizeRoles("admin", "superAdmin"),
  analyticsCacheMiddleware,
  asyncHandler(analyticsController.getMemberCohort),
);

/**
 * @swagger
 * /analytics/sales-extended:
 *   get:
 *     summary: Sales extended (growth, basket size, peak hours)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string }
 *       - in: query
 *         name: locationIds
 *         schema: { type: string }
 *         description: Comma-separated location UUIDs
 *       - in: query
 *         name: saleType
 *         schema: { type: string, enum: [GENERAL, MEMBER] }
 *       - in: query
 *         name: creditStatus
 *         schema: { type: string, enum: [credit, non-credit] }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string }
 *       - in: query
 *         name: vendorId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Extended sales metrics
 */
analyticsRouter.get(
  "/sales-extended",
  authorizeRoles("user", "admin", "superAdmin"),
  analyticsCacheMiddleware,
  asyncHandler(analyticsController.getSalesExtended),
);

/**
 * @swagger
 * /analytics/product-insights:
 *   get:
 *     summary: Product insights (ABC, sell-through, co-purchase)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string }
 *       - in: query
 *         name: locationIds
 *         schema: { type: string }
 *         description: Comma-separated location UUIDs
 *       - in: query
 *         name: saleType
 *         schema: { type: string, enum: [GENERAL, MEMBER] }
 *       - in: query
 *         name: creditStatus
 *         schema: { type: string, enum: [credit, non-credit] }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string }
 *       - in: query
 *         name: vendorId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product insights
 */
analyticsRouter.get(
  "/product-insights",
  authorizeRoles("admin", "superAdmin"),
  analyticsCacheMiddleware,
  asyncHandler(analyticsController.getProductInsights),
);

/**
 * @swagger
 * /analytics/inventory-extended:
 *   get:
 *     summary: Inventory extended (turnover, DOH, dead stock)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string }
 *       - in: query
 *         name: locationIds
 *         schema: { type: string }
 *         description: Comma-separated location UUIDs
 *       - in: query
 *         name: saleType
 *         schema: { type: string, enum: [GENERAL, MEMBER] }
 *       - in: query
 *         name: creditStatus
 *         schema: { type: string, enum: [credit, non-credit] }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string }
 *       - in: query
 *         name: vendorId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Extended inventory metrics
 */
analyticsRouter.get(
  "/inventory-extended",
  authorizeRoles("admin", "superAdmin"),
  analyticsCacheMiddleware,
  asyncHandler(analyticsController.getInventoryExtended),
);

/**
 * @swagger
 * /analytics/customer-insights:
 *   get:
 *     summary: Customer insights (CLV, retention, RFM)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string }
 *       - in: query
 *         name: locationIds
 *         schema: { type: string }
 *         description: Comma-separated location UUIDs
 *       - in: query
 *         name: saleType
 *         schema: { type: string, enum: [GENERAL, MEMBER] }
 *       - in: query
 *         name: creditStatus
 *         schema: { type: string, enum: [credit, non-credit] }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string }
 *       - in: query
 *         name: vendorId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Customer insights
 */
analyticsRouter.get(
  "/customer-insights",
  authorizeRoles("admin", "superAdmin"),
  analyticsCacheMiddleware,
  asyncHandler(analyticsController.getCustomerInsights),
);

/**
 * @swagger
 * /analytics/trends:
 *   get:
 *     summary: Trends (monthly, seasonality, peak hours)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string }
 *       - in: query
 *         name: locationIds
 *         schema: { type: string }
 *         description: Comma-separated location UUIDs
 *       - in: query
 *         name: saleType
 *         schema: { type: string, enum: [GENERAL, MEMBER] }
 *       - in: query
 *         name: creditStatus
 *         schema: { type: string, enum: [credit, non-credit] }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string }
 *       - in: query
 *         name: vendorId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Trend metrics
 */
analyticsRouter.get(
  "/trends",
  authorizeRoles("user", "admin", "superAdmin"),
  analyticsCacheMiddleware,
  asyncHandler(analyticsController.getTrends),
);

/**
 * @swagger
 * /analytics/financial:
 *   get:
 *     summary: Financial (gross profit, COGS, margins)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string }
 *       - in: query
 *         name: locationIds
 *         schema: { type: string }
 *         description: Comma-separated location UUIDs
 *       - in: query
 *         name: saleType
 *         schema: { type: string, enum: [GENERAL, MEMBER] }
 *       - in: query
 *         name: creditStatus
 *         schema: { type: string, enum: [credit, non-credit] }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string }
 *       - in: query
 *         name: vendorId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Financial metrics
 */
analyticsRouter.get(
  "/financial",
  authorizeRoles("admin", "superAdmin"),
  analyticsCacheMiddleware,
  asyncHandler(analyticsController.getFinancial),
);

/**
 * @swagger
 * /analytics/export:
 *   get:
 *     summary: Export analytics (CSV or Excel)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *         description: Report type to export
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [csv, excel] }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string }
 *       - in: query
 *         name: locationIds
 *         schema: { type: string }
 *         description: Comma-separated location UUIDs
 *       - in: query
 *         name: saleType
 *         schema: { type: string, enum: [GENERAL, MEMBER] }
 *       - in: query
 *         name: creditStatus
 *         schema: { type: string, enum: [credit, non-credit] }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string }
 *       - in: query
 *         name: vendorId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Export file
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
analyticsRouter.get(
  "/export",
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(analyticsController.exportAnalytics),
);

export default analyticsRouter;
