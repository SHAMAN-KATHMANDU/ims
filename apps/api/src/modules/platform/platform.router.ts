/**
 * Platform Admin Routes — Tenant management for platform administrators.
 *
 * All routes require authentication + platformAdmin role.
 * These routes bypass tenant scoping since they operate across tenants.
 */

import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import platformController from "./platform.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const router = Router();

// All platform routes require platformAdmin role
router.use(verifyToken, authorizeRoles("platformAdmin"));

// ============================================
// TENANT CRUD
// ============================================
router.post("/tenants", asyncHandler(platformController.createTenant));
router.get("/tenants", asyncHandler(platformController.listTenants));
router.get("/tenants/:id", asyncHandler(platformController.getTenant));
router.put("/tenants/:id", asyncHandler(platformController.updateTenant));
router.patch("/tenants/:id/plan", asyncHandler(platformController.changePlan));
router.patch(
  "/tenants/:id/activate",
  asyncHandler(platformController.activateTenant),
);
router.delete(
  "/tenants/:id",
  asyncHandler(platformController.deactivateTenant),
);

// ============================================
// PLAN LIMITS CRUD
// ============================================
router.get("/plan-limits", asyncHandler(platformController.listPlanLimits));
router.get("/plan-limits/:tier", asyncHandler(platformController.getPlanLimit));
router.post("/plan-limits", asyncHandler(platformController.upsertPlanLimit));
router.put(
  "/plan-limits/:tier",
  asyncHandler(platformController.upsertPlanLimit),
);
router.delete(
  "/plan-limits/:tier",
  asyncHandler(platformController.deletePlanLimit),
);

// ============================================
// PRICING PLANS CRUD
// ============================================
router.get("/pricing-plans", asyncHandler(platformController.listPricingPlans));
router.get(
  "/pricing-plans/:tier/:billingCycle",
  asyncHandler(platformController.getPricingPlan),
);
router.post(
  "/pricing-plans",
  asyncHandler(platformController.createPricingPlan),
);
router.put(
  "/pricing-plans/:tier/:billingCycle",
  asyncHandler(platformController.updatePricingPlan),
);
router.delete(
  "/pricing-plans/:tier/:billingCycle",
  asyncHandler(platformController.deletePricingPlan),
);

// ============================================
// SUBSCRIPTIONS CRUD
// ============================================
router.get(
  "/subscriptions",
  asyncHandler(platformController.listSubscriptions),
);
router.get(
  "/subscriptions/:id",
  asyncHandler(platformController.getSubscription),
);
router.post(
  "/subscriptions",
  asyncHandler(platformController.createSubscription),
);
router.put(
  "/subscriptions/:id",
  asyncHandler(platformController.updateSubscription),
);
router.delete(
  "/subscriptions/:id",
  asyncHandler(platformController.deleteSubscription),
);

// ============================================
// TENANT PAYMENTS CRUD
// ============================================
router.get("/payments", asyncHandler(platformController.listTenantPayments));
router.get("/payments/:id", asyncHandler(platformController.getTenantPayment));
router.post("/payments", asyncHandler(platformController.createTenantPayment));
router.put(
  "/payments/:id",
  asyncHandler(platformController.updateTenantPayment),
);
router.delete(
  "/payments/:id",
  asyncHandler(platformController.deleteTenantPayment),
);

// ============================================
// PLATFORM STATS
// ============================================
router.get("/stats", asyncHandler(platformController.getStats));

export default router;
