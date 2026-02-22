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
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/middlewares/validateRequest";
import {
  createAddOnPricingSchema,
  changePlanSchema,
  createTenantPaymentSchema,
  createSubscriptionSchema,
  createPricingPlanSchema,
  createPlatformPlanSchema,
  createTenantAddOnSchema,
  createTenantSchema,
  entityIdParamsSchema,
  listSubscriptionsQuerySchema,
  listTenantAddOnsQuerySchema,
  listTenantPaymentsQuerySchema,
  planLimitTierParamsSchema,
  pricingPlanParamsSchema,
  resetTenantUserPasswordSchema,
  tenantUserPasswordParamsSchema,
  updateAddOnPricingSchema,
  updatePlanLimitSchema,
  updateTenantAddOnSchema,
  updateTenantPaymentSchema,
  updatePricingPlanSchema,
  updatePlatformPlanSchema,
  updateSubscriptionSchema,
  updateTenantSchema,
  upsertPlanLimitSchema,
} from "./platform.schema";

const router = Router();

// All platform routes require platformAdmin role
router.use(verifyToken, authorizeRoles("platformAdmin"));

// ============================================
// TENANT CRUD
// ============================================
router.post(
  "/tenants",
  validateBody(createTenantSchema),
  asyncHandler(platformController.createTenant),
);
router.get("/tenants", asyncHandler(platformController.listTenants));
router.get(
  "/tenants/:id",
  validateParams(entityIdParamsSchema),
  asyncHandler(platformController.getTenant),
);
router.patch(
  "/tenants/:tenantId/users/:userId/password",
  validateParams(tenantUserPasswordParamsSchema),
  validateBody(resetTenantUserPasswordSchema),
  asyncHandler(platformController.resetTenantUserPassword),
);
router.put(
  "/tenants/:id",
  validateBody(updateTenantSchema),
  asyncHandler(platformController.updateTenant),
);
router.patch(
  "/tenants/:id/plan",
  validateBody(changePlanSchema),
  asyncHandler(platformController.changePlan),
);
router.patch(
  "/tenants/:id/activate",
  asyncHandler(platformController.activateTenant),
);
router.delete(
  "/tenants/:id",
  asyncHandler(platformController.deactivateTenant),
);

// ============================================
// PLAN REGISTRY CRUD
// ============================================
router.get("/plans", asyncHandler(platformController.listPlans));
router.get("/plans/:id", asyncHandler(platformController.getPlan));
router.post(
  "/plans",
  validateBody(createPlatformPlanSchema),
  asyncHandler(platformController.createPlan),
);
router.put(
  "/plans/:id",
  validateParams(entityIdParamsSchema),
  validateBody(updatePlatformPlanSchema),
  asyncHandler(platformController.updatePlan),
);
router.delete(
  "/plans/:id",
  validateParams(entityIdParamsSchema),
  asyncHandler(platformController.deletePlan),
);

// ============================================
// PLAN LIMITS CRUD
// ============================================
router.get("/plan-limits", asyncHandler(platformController.listPlanLimits));
router.get(
  "/plan-limits/:tier",
  validateParams(planLimitTierParamsSchema),
  asyncHandler(platformController.getPlanLimit),
);
router.post(
  "/plan-limits",
  validateBody(upsertPlanLimitSchema),
  asyncHandler(platformController.upsertPlanLimit),
);
router.put(
  "/plan-limits/:tier",
  validateParams(planLimitTierParamsSchema),
  validateBody(updatePlanLimitSchema),
  asyncHandler(platformController.upsertPlanLimit),
);
router.delete(
  "/plan-limits/:tier",
  validateParams(planLimitTierParamsSchema),
  asyncHandler(platformController.deletePlanLimit),
);

// ============================================
// PRICING PLANS CRUD
// ============================================
router.get("/pricing-plans", asyncHandler(platformController.listPricingPlans));
router.post(
  "/pricing-plans/initialize-defaults",
  asyncHandler(platformController.initializeDefaultPricingPlans),
);
router.get(
  "/pricing-plans/:tier/:billingCycle",
  validateParams(pricingPlanParamsSchema),
  asyncHandler(platformController.getPricingPlan),
);
router.post(
  "/pricing-plans",
  validateBody(createPricingPlanSchema),
  asyncHandler(platformController.createPricingPlan),
);
router.put(
  "/pricing-plans/:tier/:billingCycle",
  validateParams(pricingPlanParamsSchema),
  validateBody(updatePricingPlanSchema),
  asyncHandler(platformController.updatePricingPlan),
);
router.delete(
  "/pricing-plans/:tier/:billingCycle",
  validateParams(pricingPlanParamsSchema),
  asyncHandler(platformController.deletePricingPlan),
);

// ============================================
// SUBSCRIPTIONS CRUD
// ============================================
router.get(
  "/subscriptions",
  validateQuery(listSubscriptionsQuerySchema),
  asyncHandler(platformController.listSubscriptions),
);
router.get(
  "/subscriptions/:id",
  validateParams(entityIdParamsSchema),
  asyncHandler(platformController.getSubscription),
);
router.post(
  "/subscriptions",
  validateBody(createSubscriptionSchema),
  asyncHandler(platformController.createSubscription),
);
router.put(
  "/subscriptions/:id",
  validateParams(entityIdParamsSchema),
  validateBody(updateSubscriptionSchema),
  asyncHandler(platformController.updateSubscription),
);
router.delete(
  "/subscriptions/:id",
  validateParams(entityIdParamsSchema),
  asyncHandler(platformController.deleteSubscription),
);

// ============================================
// TENANT PAYMENTS CRUD
// ============================================
router.get(
  "/payments",
  validateQuery(listTenantPaymentsQuerySchema),
  asyncHandler(platformController.listTenantPayments),
);
router.get(
  "/payments/:id",
  validateParams(entityIdParamsSchema),
  asyncHandler(platformController.getTenantPayment),
);
router.post(
  "/payments",
  validateBody(createTenantPaymentSchema),
  asyncHandler(platformController.createTenantPayment),
);
router.put(
  "/payments/:id",
  validateParams(entityIdParamsSchema),
  validateBody(updateTenantPaymentSchema),
  asyncHandler(platformController.updateTenantPayment),
);
router.delete(
  "/payments/:id",
  validateParams(entityIdParamsSchema),
  asyncHandler(platformController.deleteTenantPayment),
);

// ============================================
// ADD-ON PRICING CRUD
// ============================================
router.get(
  "/add-on-pricing",
  asyncHandler(platformController.listAddOnPricing),
);
router.get(
  "/add-on-pricing/:id",
  validateParams(entityIdParamsSchema),
  asyncHandler(platformController.getAddOnPricing),
);
router.post(
  "/add-on-pricing",
  validateBody(createAddOnPricingSchema),
  asyncHandler(platformController.createAddOnPricing),
);
router.put(
  "/add-on-pricing/:id",
  validateParams(entityIdParamsSchema),
  validateBody(updateAddOnPricingSchema),
  asyncHandler(platformController.updateAddOnPricing),
);
router.delete(
  "/add-on-pricing/:id",
  validateParams(entityIdParamsSchema),
  asyncHandler(platformController.deleteAddOnPricing),
);

// ============================================
// TENANT ADD-ONS MANAGEMENT
// ============================================
router.get(
  "/tenant-add-ons",
  validateQuery(listTenantAddOnsQuerySchema),
  asyncHandler(platformController.listTenantAddOns),
);
router.get(
  "/tenant-add-ons/:id",
  validateParams(entityIdParamsSchema),
  asyncHandler(platformController.getTenantAddOn),
);
router.post(
  "/tenant-add-ons",
  validateBody(createTenantAddOnSchema),
  asyncHandler(platformController.createTenantAddOn),
);
router.put(
  "/tenant-add-ons/:id",
  validateParams(entityIdParamsSchema),
  validateBody(updateTenantAddOnSchema),
  asyncHandler(platformController.updateTenantAddOn),
);
router.patch(
  "/tenant-add-ons/:id/approve",
  validateParams(entityIdParamsSchema),
  asyncHandler(platformController.approveTenantAddOn),
);
router.patch(
  "/tenant-add-ons/:id/cancel",
  validateParams(entityIdParamsSchema),
  asyncHandler(platformController.cancelTenantAddOn),
);
router.delete(
  "/tenant-add-ons/:id",
  validateParams(entityIdParamsSchema),
  asyncHandler(platformController.deleteTenantAddOn),
);

// ============================================
// PLATFORM STATS & ANALYTICS
// ============================================
router.get("/stats", asyncHandler(platformController.getStats));
router.get("/analytics", asyncHandler(platformController.getAnalytics));

// ============================================
// TENANT DETAIL (enhanced with usage/add-ons)
// ============================================
router.get(
  "/tenants/:id/detail",
  validateParams(entityIdParamsSchema),
  asyncHandler(platformController.getTenantDetail),
);

// ============================================
// SUBSCRIPTION LIFECYCLE
// ============================================
router.post(
  "/subscriptions/check-expiry",
  asyncHandler(platformController.checkSubscriptionExpiry),
);

export default router;
