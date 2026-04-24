/**
 * WebsiteOrders Router — tenant-admin side of the guest-checkout flow.
 * Mounted under /website-orders. Inherits auth + tenant resolution from
 * the main chain. Role: admin or superAdmin.
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import { requirePermission } from "@/middlewares/requirePermission";
import {
  paramLocator,
  workspaceLocator,
} from "@/shared/permissions/resourceLocator";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { asyncHandler } from "@/middlewares/errorHandler";
import controller from "./website-orders.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));

/**
 * @swagger
 * /website-orders:
 *   get:
 *     summary: List guest orders placed on the tenant-site
 *     tags: [WebsiteOrders]
 */
router.get(
  "/",
  requirePermission("SALES.WEBSITE_ORDERS.VIEW", workspaceLocator()),
  asyncHandler(controller.listOrders),
);

/**
 * @swagger
 * /website-orders/{id}/stock-check:
 *   get:
 *     summary: Check stock availability per item across locations
 *     tags: [WebsiteOrders]
 */
router.get(
  "/:id/stock-check",
  requirePermission("SALES.WEBSITE_ORDERS.VIEW", paramLocator("WEBSITE_ORDER")),
  asyncHandler(controller.checkOrderStock),
);

/**
 * @swagger
 * /website-orders/{id}:
 *   get:
 *     summary: Get a single website order (full items snapshot)
 *     tags: [WebsiteOrders]
 */
router.get(
  "/:id",
  requirePermission("SALES.WEBSITE_ORDERS.VIEW", paramLocator("WEBSITE_ORDER")),
  asyncHandler(controller.getOrder),
);

/**
 * @swagger
 * /website-orders/{id}/verify:
 *   post:
 *     summary: Mark an order as verified (admin has confirmed with the customer)
 *     tags: [WebsiteOrders]
 */
router.post(
  "/:id/verify",
  requirePermission(
    "SALES.WEBSITE_ORDERS.VERIFY",
    paramLocator("WEBSITE_ORDER"),
  ),
  asyncHandler(controller.verifyOrder),
);

/**
 * @swagger
 * /website-orders/{id}/reject:
 *   post:
 *     summary: Reject an order (spam / fake / cancelled)
 *     tags: [WebsiteOrders]
 */
router.post(
  "/:id/reject",
  requirePermission(
    "SALES.WEBSITE_ORDERS.REJECT",
    paramLocator("WEBSITE_ORDER"),
  ),
  asyncHandler(controller.rejectOrder),
);

/**
 * @swagger
 * /website-orders/{id}/convert:
 *   post:
 *     summary: Convert a verified order into a real Sale
 *     tags: [WebsiteOrders]
 */
router.post(
  "/:id/convert",
  requirePermission(
    "SALES.WEBSITE_ORDERS.CONVERT",
    paramLocator("WEBSITE_ORDER"),
  ),
  asyncHandler(controller.convertOrder),
);

/**
 * @swagger
 * /website-orders/{id}:
 *   delete:
 *     summary: Delete a website order (only if not yet converted)
 *     tags: [WebsiteOrders]
 */
router.delete(
  "/:id",
  requirePermission(
    "SALES.WEBSITE_ORDERS.REJECT",
    paramLocator("WEBSITE_ORDER"),
  ),
  asyncHandler(controller.deleteOrder),
);

export default router;
