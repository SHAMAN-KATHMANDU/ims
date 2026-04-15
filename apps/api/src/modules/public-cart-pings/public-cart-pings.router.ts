/**
 * Public Cart Pings Router — unauthenticated cart-activity heartbeat.
 *
 * Mounted under /public/cart-pings BEFORE the auth chain in
 * router.config.ts. Tenant is resolved from the Host header.
 *
 * The tenant-site CartProvider POSTs on every debounced cart mutation;
 * the handler upserts an AbandonedCart row keyed by (tenantId, sessionKey).
 * A periodic sweep job (see abandoned-carts.scheduler.ts) finds stale
 * rows and publishes the `cart.abandoned` automation event.
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import { asyncHandler } from "@/middlewares/errorHandler";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { resolveTenantFromHostname } from "@/middlewares/hostnameResolver";
import controller from "./public-cart-pings.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));
router.use(resolveTenantFromHostname());

/**
 * @swagger
 * /public/cart-pings:
 *   post:
 *     summary: Upsert a cart-activity snapshot for abandoned-cart detection
 *     tags: [PublicCartPings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionKey, items]
 *             properties:
 *               sessionKey:    { type: string, description: "UUID from browser localStorage" }
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
 *               customerName:  { type: string }
 *               customerPhone: { type: string }
 *               customerEmail: { type: string, format: email }
 *     responses:
 *       204: { description: Ping recorded (or empty-cart row removed) }
 *       400: { description: Validation error }
 *       403: { description: Website feature not enabled for this tenant }
 */
router.post("/", asyncHandler(controller.recordPing));

export default router;
