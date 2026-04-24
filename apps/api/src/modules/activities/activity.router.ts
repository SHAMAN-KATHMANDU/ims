import { Router, Request } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { requirePermission } from "@/middlewares/requirePermission";
import { enforcePlanFeature } from "@/middlewares/enforcePlanLimits";
import activityController from "./activity.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const activityRouter = Router();

activityRouter.use(authorizeRoles("user", "admin", "superAdmin"));
activityRouter.use(enforcePlanFeature("salesPipeline"));

const workspaceLocator = (): string => "WORKSPACE";
const idLocator = (req: Request): string => req.params.id;
const contactLocator = (req: Request): string => req.params.contactId;
const dealLocator = (req: Request): string => req.params.dealId;

/**
 * @swagger
 * /activities:
 *   post:
 *     summary: Create activity
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201: { description: Activity created }
 */
activityRouter.post(
  "/",
  requirePermission("CRM.ACTIVITIES.CREATE", workspaceLocator),
  asyncHandler(activityController.create),
);

/**
 * @swagger
 * /activities/contact/{contactId}:
 *   get:
 *     summary: Get activities by contact
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Activities list }
 */
activityRouter.get(
  "/contact/:contactId",
  requirePermission("CRM.ACTIVITIES.VIEW", contactLocator),
  asyncHandler(activityController.getByContact),
);

/**
 * @swagger
 * /activities/deal/{dealId}:
 *   get:
 *     summary: Get activities by deal
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Activities list }
 */
activityRouter.get(
  "/deal/:dealId",
  requirePermission("CRM.ACTIVITIES.VIEW", dealLocator),
  asyncHandler(activityController.getByDeal),
);

/**
 * @swagger
 * /activities/{id}:
 *   get:
 *     summary: Get activity by ID
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Activity details }
 *       404: { description: Not found }
 */
activityRouter.get(
  "/:id",
  requirePermission("CRM.ACTIVITIES.VIEW", idLocator),
  asyncHandler(activityController.getById),
);

/**
 * @swagger
 * /activities/{id}:
 *   delete:
 *     summary: Delete activity
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Activity deleted }
 */
activityRouter.delete(
  "/:id",
  requirePermission("CRM.ACTIVITIES.DELETE", idLocator),
  asyncHandler(activityController.delete),
);

export default activityRouter;
