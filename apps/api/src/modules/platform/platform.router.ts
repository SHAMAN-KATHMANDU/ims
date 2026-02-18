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

const router = Router();

// All platform routes require platformAdmin role
router.use(verifyToken, authorizeRoles("platformAdmin"));

// ============================================
// TENANT CRUD
// ============================================
router.post("/tenants", platformController.createTenant);
router.get("/tenants", platformController.listTenants);
router.get("/tenants/:id", platformController.getTenant);
router.put("/tenants/:id", platformController.updateTenant);
router.patch("/tenants/:id/plan", platformController.changePlan);
router.patch("/tenants/:id/activate", platformController.activateTenant);
router.delete("/tenants/:id", platformController.deactivateTenant);

// ============================================
// PLAN LIMITS CRUD
// ============================================
router.get("/plan-limits", platformController.listPlanLimits);
router.get("/plan-limits/:tier", platformController.getPlanLimit);
router.post("/plan-limits", platformController.upsertPlanLimit);
router.put("/plan-limits/:tier", platformController.upsertPlanLimit);
router.delete("/plan-limits/:tier", platformController.deletePlanLimit);

// ============================================
// PRICING PLANS CRUD
// ============================================
router.get("/pricing-plans", platformController.listPricingPlans);
router.get(
  "/pricing-plans/:tier/:billingCycle",
  platformController.getPricingPlan,
);
router.post("/pricing-plans", platformController.createPricingPlan);
router.put(
  "/pricing-plans/:tier/:billingCycle",
  platformController.updatePricingPlan,
);
router.delete(
  "/pricing-plans/:tier/:billingCycle",
  platformController.deletePricingPlan,
);

// ============================================
// SUBSCRIPTIONS CRUD
// ============================================
router.get("/subscriptions", platformController.listSubscriptions);
router.get("/subscriptions/:id", platformController.getSubscription);
router.post("/subscriptions", platformController.createSubscription);
router.put("/subscriptions/:id", platformController.updateSubscription);
router.delete("/subscriptions/:id", platformController.deleteSubscription);

// ============================================
// TENANT PAYMENTS CRUD
// ============================================
router.get("/payments", platformController.listTenantPayments);
router.get("/payments/:id", platformController.getTenantPayment);
router.post("/payments", platformController.createTenantPayment);
router.put("/payments/:id", platformController.updateTenantPayment);
router.delete("/payments/:id", platformController.deleteTenantPayment);

// ============================================
// PLATFORM STATS
// ============================================
router.get("/stats", platformController.getStats);

export default router;
