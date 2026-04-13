/**
 * Platform Admin Routes — Tenant management for platform administrators.
 * All routes require platformAdmin role.
 */

import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import platformController from "./platform.controller";
import trashRouter from "@/modules/trash/trash.router";
import platformDomainsRouter from "@/modules/platform-domains/platform-domains.router";
import platformWebsitesRouter from "@/modules/platform-websites/platform-websites.router";
import { asyncHandler } from "@/middlewares/errorHandler";

const router = Router();

router.use(authorizeRoles("platformAdmin"));

/** Tenant domain management (platformAdmin only — inherited from parent). */
router.use("/", platformDomainsRouter);

/** Tenant website feature toggle + template picker (platformAdmin only). */
router.use("/", platformWebsitesRouter);

/**
 * @swagger
 * /platform/tenants:
 *   post:
 *     summary: Create a tenant
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, slug]
 *             properties:
 *               name: { type: string }
 *               slug: { type: string }
 *     responses:
 *       201: { description: Tenant created }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.post("/tenants", asyncHandler(platformController.createTenant));

/**
 * @swagger
 * /platform/tenants:
 *   get:
 *     summary: List all tenants
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200: { description: Tenants list }
 */
router.get("/tenants", asyncHandler(platformController.listTenants));

/**
 * @swagger
 * /platform/tenants/{id}:
 *   get:
 *     summary: Get tenant by ID
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Tenant details }
 *       404: { description: Tenant not found }
 */
router.get("/tenants/:id", asyncHandler(platformController.getTenant));
/**
 * @swagger
 * /platform/tenants/{tenantId}/users:
 *   post:
 *     summary: Create a user for a tenant
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password, role]
 *             properties:
 *               username: { type: string }
 *               password: { type: string }
 *               role: { type: string, enum: [admin, user] }
 *     responses:
 *       201: { description: User created }
 */
router.post(
  "/tenants/:tenantId/users",
  asyncHandler(platformController.createTenantUser),
);

/**
 * @swagger
 * /platform/tenants/{tenantId}/users/{userId}/password:
 *   patch:
 *     summary: Reset tenant user password
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPassword]
 *             properties:
 *               newPassword: { type: string }
 *     responses:
 *       200: { description: Password reset }
 */
router.patch(
  "/tenants/:tenantId/users/:userId/password",
  asyncHandler(platformController.resetTenantUserPassword),
);

/**
 * @swagger
 * /platform/tenants/{id}:
 *   put:
 *     summary: Update tenant
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               slug: { type: string }
 *               isActive: { type: boolean }
 *     responses:
 *       200: { description: Tenant updated }
 */
router.put("/tenants/:id", asyncHandler(platformController.updateTenant));

/**
 * @swagger
 * /platform/tenants/{id}/plan:
 *   patch:
 *     summary: Change tenant plan
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tier: { type: string }
 *               billingCycle: { type: string }
 *     responses:
 *       200: { description: Plan updated }
 */
router.patch("/tenants/:id/plan", asyncHandler(platformController.changePlan));

/**
 * @swagger
 * /platform/tenants/{id}/activate:
 *   patch:
 *     summary: Activate tenant
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Tenant activated }
 */
router.patch(
  "/tenants/:id/activate",
  asyncHandler(platformController.activateTenant),
);

/**
 * @swagger
 * /platform/tenants/{id}:
 *   delete:
 *     summary: Deactivate tenant
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Tenant deactivated }
 */
router.delete(
  "/tenants/:id",
  asyncHandler(platformController.deactivateTenant),
);

/**
 * @swagger
 * /platform/plan-limits:
 *   get:
 *     summary: List plan limits
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Plan limits list }
 */
router.get("/plan-limits", asyncHandler(platformController.listPlanLimits));
/**
 * @swagger
 * /platform/plan-limits/{tier}:
 *   get:
 *     summary: Get plan limit by tier
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tier
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Plan limit }
 *       404: { description: Not found }
 */
router.get("/plan-limits/:tier", asyncHandler(platformController.getPlanLimit));

/**
 * @swagger
 * /platform/plan-limits:
 *   post:
 *     summary: Create or update plan limit
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tier]
 *             properties:
 *               tier: { type: string }
 *               products: { type: integer }
 *               users: { type: integer }
 *               locations: { type: integer }
 *     responses:
 *       200: { description: Plan limit upserted }
 */
router.post("/plan-limits", asyncHandler(platformController.upsertPlanLimit));

/**
 * @swagger
 * /platform/plan-limits/{tier}:
 *   put:
 *     summary: Update plan limit
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tier
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               products: { type: integer }
 *               users: { type: integer }
 *               locations: { type: integer }
 *     responses:
 *       200: { description: Plan limit updated }
 */
router.put(
  "/plan-limits/:tier",
  asyncHandler(platformController.upsertPlanLimit),
);

/**
 * @swagger
 * /platform/plan-limits/{tier}:
 *   delete:
 *     summary: Delete plan limit
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tier
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Plan limit deleted }
 */
router.delete(
  "/plan-limits/:tier",
  asyncHandler(platformController.deletePlanLimit),
);

/**
 * @swagger
 * /platform/pricing-plans:
 *   get:
 *     summary: List pricing plans
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Pricing plans list }
 */
router.get("/pricing-plans", asyncHandler(platformController.listPricingPlans));
/**
 * @swagger
 * /platform/pricing-plans/{tier}/{billingCycle}:
 *   get:
 *     summary: Get pricing plan
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tier
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: billingCycle
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Pricing plan }
 */
router.get(
  "/pricing-plans/:tier/:billingCycle",
  asyncHandler(platformController.getPricingPlan),
);

/**
 * @swagger
 * /platform/pricing-plans:
 *   post:
 *     summary: Create pricing plan
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tier, billingCycle, price]
 *             properties:
 *               tier: { type: string }
 *               billingCycle: { type: string }
 *               price: { type: number }
 *     responses:
 *       201: { description: Pricing plan created }
 */
router.post(
  "/pricing-plans",
  asyncHandler(platformController.createPricingPlan),
);

/**
 * @swagger
 * /platform/pricing-plans/{tier}/{billingCycle}:
 *   put:
 *     summary: Update pricing plan
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tier
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: billingCycle
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               price: { type: number }
 *     responses:
 *       200: { description: Pricing plan updated }
 */
router.put(
  "/pricing-plans/:tier/:billingCycle",
  asyncHandler(platformController.updatePricingPlan),
);

/**
 * @swagger
 * /platform/pricing-plans/{tier}/{billingCycle}:
 *   delete:
 *     summary: Delete pricing plan
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tier
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: billingCycle
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Pricing plan deleted }
 */
router.delete(
  "/pricing-plans/:tier/:billingCycle",
  asyncHandler(platformController.deletePricingPlan),
);

/**
 * @swagger
 * /platform/subscriptions:
 *   get:
 *     summary: List subscriptions
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Subscriptions list }
 */
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

/**
 * @swagger
 * /platform/payments:
 *   get:
 *     summary: List tenant payments
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         schema: { type: string, format: uuid }
 *         description: Filter by tenant
 *       - in: query
 *         name: subscriptionId
 *         schema: { type: string, format: uuid }
 *         description: Filter by subscription
 *     responses:
 *       200: { description: Payments list }
 */
router.get("/payments", asyncHandler(platformController.listTenantPayments));
/**
 * @swagger
 * /platform/payments/{id}:
 *   get:
 *     summary: Get tenant payment by ID
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Payment details }
 *       404: { description: Not found }
 */
router.get("/payments/:id", asyncHandler(platformController.getTenantPayment));

/**
 * @swagger
 * /platform/payments:
 *   post:
 *     summary: Create tenant payment
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenantId, amount]
 *             properties:
 *               tenantId: { type: string, format: uuid }
 *               amount: { type: number }
 *               method: { type: string }
 *     responses:
 *       201: { description: Payment created }
 */
router.post("/payments", asyncHandler(platformController.createTenantPayment));

/**
 * @swagger
 * /platform/payments/{id}:
 *   put:
 *     summary: Update tenant payment
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount: { type: number }
 *               status: { type: string }
 *     responses:
 *       200: { description: Payment updated }
 */
router.put(
  "/payments/:id",
  asyncHandler(platformController.updateTenantPayment),
);

/**
 * @swagger
 * /platform/payments/{id}:
 *   delete:
 *     summary: Delete tenant payment
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Payment deleted }
 */
router.delete(
  "/payments/:id",
  asyncHandler(platformController.deleteTenantPayment),
);

/**
 * @swagger
 * /platform/password-reset-requests:
 *   get:
 *     summary: List escalated password reset requests
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Password reset requests list }
 */
router.get(
  "/password-reset-requests",
  asyncHandler(platformController.getPlatformResetRequests),
);

/**
 * @swagger
 * /platform/password-reset-requests/{requestId}/approve:
 *   post:
 *     summary: Approve escalated password reset request
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPassword]
 *             properties:
 *               newPassword: { type: string }
 *     responses:
 *       200: { description: Approved }
 */
router.post(
  "/password-reset-requests/:requestId/approve",
  asyncHandler(platformController.approvePlatformResetRequest),
);

/**
 * @swagger
 * /platform/stats:
 *   get:
 *     summary: Get platform statistics
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Platform stats }
 */
router.get("/stats", asyncHandler(platformController.getStats));

/** Platform trash — list, restore, permanently delete (platformAdmin only). */
router.use("/trash", trashRouter);

export default router;
