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

export default analyticsRouter;
