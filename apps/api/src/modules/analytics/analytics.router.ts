import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import analyticsController from "@/modules/analytics/analytics.controller";
import { analyticsCacheMiddleware } from "@/modules/analytics/analyticsCacheMiddleware";

const analyticsRouter = Router();

analyticsRouter.use(verifyToken);

// Overview (admin and superAdmin only)
analyticsRouter.get(
  "/overview",
  authorizeRoles("admin", "superAdmin"),
  analyticsController.getOverview.bind(analyticsController),
);

// Sales & Revenue analytics: user sees own data only (enforced in controller via filter/role)
analyticsRouter.get(
  "/sales-revenue",
  authorizeRoles("user", "admin", "superAdmin"),
  analyticsCacheMiddleware,
  analyticsController.getSalesRevenue.bind(analyticsController),
);

// Inventory & Operations: admin/superAdmin only (workspace-level data)
analyticsRouter.get(
  "/inventory-ops",
  authorizeRoles("admin", "superAdmin"),
  analyticsCacheMiddleware,
  analyticsController.getInventoryOps.bind(analyticsController),
);

// Customers, Products & Promotions: admin/superAdmin only (user sees own sales in composition)
analyticsRouter.get(
  "/customers-promos",
  authorizeRoles("admin", "superAdmin"),
  analyticsCacheMiddleware,
  analyticsController.getCustomersPromos.bind(analyticsController),
);

// Discount analytics: user sees own only (backend enforces)
analyticsRouter.get(
  "/discount",
  authorizeRoles("user", "admin", "superAdmin"),
  analyticsCacheMiddleware,
  analyticsController.getDiscountAnalytics.bind(analyticsController),
);

// Payment method trends over time
analyticsRouter.get(
  "/payment-trends",
  authorizeRoles("user", "admin", "superAdmin"),
  analyticsCacheMiddleware,
  analyticsController.getPaymentTrends.bind(analyticsController),
);

// Location comparison
analyticsRouter.get(
  "/location-comparison",
  authorizeRoles("user", "admin", "superAdmin"),
  analyticsCacheMiddleware,
  analyticsController.getLocationComparison.bind(analyticsController),
);

// Member cohort (new vs repeat)
analyticsRouter.get(
  "/member-cohort",
  authorizeRoles("admin", "superAdmin"),
  analyticsCacheMiddleware,
  analyticsController.getMemberCohort.bind(analyticsController),
);

// Sales Extended (growth, basket size, peak hours, gross profit)
analyticsRouter.get(
  "/sales-extended",
  authorizeRoles("user", "admin", "superAdmin"),
  analyticsCacheMiddleware,
  analyticsController.getSalesExtended.bind(analyticsController),
);

// Product Insights (ABC, sell-through, co-purchase, category revenue)
analyticsRouter.get(
  "/product-insights",
  authorizeRoles("admin", "superAdmin"),
  analyticsCacheMiddleware,
  analyticsController.getProductInsights.bind(analyticsController),
);

// Inventory Extended (turnover, DOH, stock-to-sales, dead stock, sell-through by location)
analyticsRouter.get(
  "/inventory-extended",
  authorizeRoles("admin", "superAdmin"),
  analyticsCacheMiddleware,
  analyticsController.getInventoryExtended.bind(analyticsController),
);

// Customer Insights (CLV, retention, churn, RFM, frequency, member growth)
analyticsRouter.get(
  "/customer-insights",
  authorizeRoles("admin", "superAdmin"),
  analyticsCacheMiddleware,
  analyticsController.getCustomerInsights.bind(analyticsController),
);

// Trends (monthly totals, seasonality, cohort retention, peak hours)
analyticsRouter.get(
  "/trends",
  authorizeRoles("user", "admin", "superAdmin"),
  analyticsCacheMiddleware,
  analyticsController.getTrends.bind(analyticsController),
);

// Financial (gross profit, COGS, margins)
analyticsRouter.get(
  "/financial",
  authorizeRoles("admin", "superAdmin"),
  analyticsCacheMiddleware,
  analyticsController.getFinancial.bind(analyticsController),
);

// Export analytics (CSV or Excel)
analyticsRouter.get(
  "/export",
  authorizeRoles("user", "admin", "superAdmin"),
  analyticsController.exportAnalytics.bind(analyticsController),
);

export default analyticsRouter;
