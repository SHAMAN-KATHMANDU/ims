/**
 * WebsiteOrders Router — tenant-admin side of the guest-checkout flow.
 * Mounted under /website-orders. Inherits auth + tenant resolution from
 * the main chain. Role: admin or superAdmin.
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { asyncHandler } from "@/middlewares/errorHandler";
import controller from "./website-orders.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));
router.use(authorizeRoles("admin", "superAdmin"));

/**
 * @swagger
 * /website-orders:
 *   get:
 *     summary: List guest orders placed on the tenant-site
 *     tags: [WebsiteOrders]
 */
router.get("/", asyncHandler(controller.listOrders));

/**
 * @swagger
 * /website-orders/{id}/stock-check:
 *   get:
 *     summary: Check stock availability per item across locations
 *     tags: [WebsiteOrders]
 */
router.get("/:id/stock-check", asyncHandler(controller.checkOrderStock));

/**
 * @swagger
 * /website-orders/{id}:
 *   get:
 *     summary: Get a single website order (full items snapshot)
 *     tags: [WebsiteOrders]
 */
router.get("/:id", asyncHandler(controller.getOrder));

/**
 * @swagger
 * /website-orders/{id}/verify:
 *   post:
 *     summary: Mark an order as verified (admin has confirmed with the customer)
 *     tags: [WebsiteOrders]
 */
router.post("/:id/verify", asyncHandler(controller.verifyOrder));

/**
 * @swagger
 * /website-orders/{id}/reject:
 *   post:
 *     summary: Reject an order (spam / fake / cancelled)
 *     tags: [WebsiteOrders]
 */
router.post("/:id/reject", asyncHandler(controller.rejectOrder));

/**
 * @swagger
 * /website-orders/{id}/convert:
 *   post:
 *     summary: Convert a verified order into a real Sale
 *     tags: [WebsiteOrders]
 */
router.post("/:id/convert", asyncHandler(controller.convertOrder));

/**
 * @swagger
 * /website-orders/{id}:
 *   delete:
 *     summary: Delete a website order (only if not yet converted)
 *     tags: [WebsiteOrders]
 */
router.delete("/:id", asyncHandler(controller.deleteOrder));

export default router;
