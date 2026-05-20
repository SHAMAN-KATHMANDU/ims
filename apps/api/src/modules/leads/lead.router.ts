import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { requirePermission } from "@/middlewares/requirePermission";
import {
  paramLocator,
  workspaceLocator,
} from "@/shared/permissions/resourceLocator";
import { enforcePlanFeature } from "@/middlewares/enforcePlanLimits";
import leadController from "./lead.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const leadRouter = Router();

leadRouter.use(authorizeRoles("user", "admin", "superAdmin"));
leadRouter.use(enforcePlanFeature("salesPipeline"));

/**
 * @swagger
 * /leads:
 *   post:
 *     summary: Create lead
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201: { description: Lead created }
 */
leadRouter.post(
  "/",
  requirePermission("CRM.LEADS.CREATE", workspaceLocator()),
  asyncHandler(leadController.create),
);

/**
 * @swagger
 * /leads:
 *   get:
 *     summary: Get all leads
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Leads list }
 */
leadRouter.get(
  "/",
  requirePermission("CRM.LEADS.VIEW", workspaceLocator()),
  asyncHandler(leadController.getAll),
);

/**
 * @swagger
 * /leads/{id}:
 *   get:
 *     summary: Get lead by ID
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Lead details }
 *       404: { description: Not found }
 */
leadRouter.get(
  "/:id",
  requirePermission("CRM.LEADS.VIEW", paramLocator("LEAD")),
  asyncHandler(leadController.getById),
);

/**
 * @swagger
 * /leads/{id}:
 *   put:
 *     summary: Update lead
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Lead updated }
 */
leadRouter.put(
  "/:id",
  requirePermission("CRM.LEADS.UPDATE", paramLocator("LEAD")),
  asyncHandler(leadController.update),
);

/**
 * @swagger
 * /leads/{id}:
 *   delete:
 *     summary: Delete lead
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Lead deleted }
 */
leadRouter.delete(
  "/:id",
  requirePermission("CRM.LEADS.DELETE", paramLocator("LEAD")),
  asyncHandler(leadController.delete),
);

/**
 * @swagger
 * /leads/{id}/convert:
 *   post:
 *     summary: Convert lead to contact/deal
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Lead converted }
 */
leadRouter.post(
  "/:id/convert",
  requirePermission("CRM.LEADS.CONVERT", paramLocator("LEAD")),
  asyncHandler(leadController.convert),
);

/**
 * @swagger
 * /leads/{id}/assign:
 *   post:
 *     summary: Assign lead to user
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Lead assigned }
 */
leadRouter.post(
  "/:id/assign",
  requirePermission("CRM.LEADS.ASSIGN", paramLocator("LEAD")),
  asyncHandler(leadController.assign),
);

export default leadRouter;
