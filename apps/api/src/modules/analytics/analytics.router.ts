import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { enforcePlanFeature } from "@/middlewares/enforcePlanLimits";
import analyticsController from "@/modules/analytics/analytics.controller";
import { analyticsCacheMiddleware } from "@/modules/analytics/analyticsCacheMiddleware";
import { asyncHandler } from "@/middlewares/errorHandler";

const analyticsRouter = Router();

// All analytics routes require the analytics plan feature
analyticsRouter.use(enforcePlanFeature("analytics"));

// Overview (admin and superAdmin only)
analyticsRouter.get(
  "/overview",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(analyticsController.getOverview),
);

// Sales & Revenue analytics: user sees own data only (enforced in controller via filter/role)
analyticsRouter.get(
  "/sales-revenue",
  authorizeRoles("user", "admin", "superAdmin"),
  analyticsCacheMiddleware,
  asyncHandler(analyticsController.getSalesRevenue),
);

// Inventory & Operations: admin/superAdmin only (workspace-level data)
analyticsRouter.get(
  "/inventory-ops",
  authorizeRoles("admin", "superAdmin"),
  analyticsCacheMiddleware,
  asyncHandler(analyticsController.getInventoryOps),
);

// Customers, Products & Promotions: admin/superAdmin only (user sees own sales in composition)
analyticsRouter.get(
  "/customers-promos",
  authorizeRoles("admin", "superAdmin"),
  analyticsCacheMiddleware,
  asyncHandler(analyticsController.getCustomersPromos),
);

// Discount analytics: user sees own only (backend enforces)
analyticsRouter.get(
  "/discount",
  authorizeRoles("user", "admin", "superAdmin"),
  analyticsCacheMiddleware,
  asyncHandler(analyticsController.getDiscountAnalytics),
);

// Payment method trends over time
analyticsRouter.get(
  "/payment-trends",
  authorizeRoles("user", "admin", "superAdmin"),
  analyticsCacheMiddleware,
  asyncHandler(analyticsController.getPaymentTrends),
);

// Location comparison
analyticsRouter.get(
  "/location-comparison",
  authorizeRoles("user", "admin", "superAdmin"),
  analyticsCacheMiddleware,
  asyncHandler(analyticsController.getLocationComparison),
);

// Member cohort (new vs repeat)
analyticsRouter.get(
  "/member-cohort",
  authorizeRoles("admin", "superAdmin"),
  analyticsCacheMiddleware,
  asyncHandler(analyticsController.getMemberCohort),
);

// Sales Extended (growth, basket size, peak hours, gross profit)
analyticsRouter.get(
  "/sales-extended",
  authorizeRoles("user", "admin", "superAdmin"),
  analyticsCacheMiddleware,
  asyncHandler(analyticsController.getSalesExtended),
);

// Product Insights (ABC, sell-through, co-purchase, category revenue)
analyticsRouter.get(
  "/product-insights",
  authorizeRoles("admin", "superAdmin"),
  analyticsCacheMiddleware,
  asyncHandler(analyticsController.getProductInsights),
);

// Inventory Extended (turnover, DOH, stock-to-sales, dead stock, sell-through by location)
analyticsRouter.get(
  "/inventory-extended",
  authorizeRoles("admin", "superAdmin"),
  analyticsCacheMiddleware,
  asyncHandler(analyticsController.getInventoryExtended),
);

// Customer Insights (CLV, retention, churn, RFM, frequency, member growth)
analyticsRouter.get(
  "/customer-insights",
  authorizeRoles("admin", "superAdmin"),
  analyticsCacheMiddleware,
  asyncHandler(analyticsController.getCustomerInsights),
);

// Trends (monthly totals, seasonality, cohort retention, peak hours)
analyticsRouter.get(
  "/trends",
  authorizeRoles("user", "admin", "superAdmin"),
  analyticsCacheMiddleware,
  asyncHandler(analyticsController.getTrends),
);

// Financial (gross profit, COGS, margins)
analyticsRouter.get(
  "/financial",
  authorizeRoles("admin", "superAdmin"),
  analyticsCacheMiddleware,
  asyncHandler(analyticsController.getFinancial),
);

// Export analytics (CSV or Excel)
analyticsRouter.get(
  "/export",
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(analyticsController.exportAnalytics),
);

export default analyticsRouter;
