// import { Router } from "express";
// import verifyToken from "@/middlewares/authMiddleware";
// import authorizeRoles from "@/middlewares/roleMiddleware";
// import analyticsController from "@/modules/analytics/analytics.controller";

// const analyticsRouter = Router();

// // All analytics routes are protected by authentication and authorization
// analyticsRouter.use(verifyToken);

// // User analytics (superadmin only)
// analyticsRouter.get("/users/overview", verifyToken, authorizeRoles("superAdmin"), analyticsController.getUserAnalytics);
// analyticsRouter.get("/users/growth", verifyToken, authorizeRoles("superAdmin"), analyticsController.getUserGrowth);
// analyticsRouter.get("/users/activity", verifyToken, authorizeRoles("superAdmin"), analyticsController.getUserActivity);
// // Product analytics (superAdmin and admin only)
// analyticsRouter.get("/products/overview", verifyToken, authorizeRoles("superAdmin", "admin"), analyticsController.getProductAnalytics);
// analyticsRouter.get("/products/by-category", verifyToken, authorizeRoles("superAdmin", "admin"), analyticsController.getProductByCategory);
// analyticsRouter.get("/products/top-products", verifyToken, authorizeRoles("superAdmin", "admin"), analyticsController.getTopProducts);
// analyticsRouter.get("/products/inventory-status", verifyToken, authorizeRoles("superAdmin", "admin"), analyticsController.getInventoryStatus);
// analyticsRouter.get("/products/low-stock", verifyToken, authorizeRoles("superAdmin", "admin"), analyticsController.getLowStock);
// analyticsRouter.get("/products/proce-analysis", verifyToken, authorizeRoles("superAdmin", "admin"), analyticsController.getProceAnalysis);
// analyticsRouter.get("/products/discount-analysis", verifyToken, authorizeRoles("superAdmin", "admin"), analyticsController.getDiscountAnalysis);
// analyticsRouter.get("/products/variation-summary", verifyToken, authorizeRoles("superAdmin", "admin"), analyticsController.getVariationSummary);
// analyticsRouter.get("/products/sales-performance", verifyToken, authorizeRoles("superAdmin", "admin"), analyticsController.getSalesPerformance);
