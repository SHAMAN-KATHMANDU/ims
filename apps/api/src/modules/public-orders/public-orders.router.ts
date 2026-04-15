/**
 * Public Orders Router — unauthenticated guest-checkout endpoint.
 *
 * Mounted under /public/orders BEFORE the auth chain in router.config.ts.
 * Tenant is resolved from the request Host header by
 * `resolveTenantFromHostname` — the same middleware public-site /
 * public-blog / public-pages use.
 *
 * Only exposes POST today. The cart-state UI on the tenant-site is
 * localStorage-driven; there's no "get my orders back" lookup yet.
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import { asyncHandler } from "@/middlewares/errorHandler";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { resolveTenantFromHostname } from "@/middlewares/hostnameResolver";
import controller from "./public-orders.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));
router.use(resolveTenantFromHostname());

/**
 * @swagger
 * /public/orders:
 *   post:
 *     summary: Create a guest order from the tenant-site cart
 *     tags: [PublicOrders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerName, customerPhone, items]
 *             properties:
 *               customerName:  { type: string }
 *               customerPhone: { type: string }
 *               customerEmail: { type: string, format: email }
 *               customerNote:  { type: string }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:   { type: string, format: uuid }
 *                     productName: { type: string }
 *                     unitPrice:   { type: number }
 *                     quantity:    { type: integer }
 *                     lineTotal:   { type: number }
 *     responses:
 *       201: { description: Order received with a tenant-scoped orderCode }
 *       400: { description: Validation error or empty cart }
 *       403: { description: Website feature not enabled for this tenant }
 */
router.post("/", asyncHandler(controller.createOrder));

export default router;
