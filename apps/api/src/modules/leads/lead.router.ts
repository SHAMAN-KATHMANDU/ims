import { Router, Request } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { requirePermission } from "@/middlewares/requirePermission";
import { enforcePlanFeature } from "@/middlewares/enforcePlanLimits";
import leadController from "./lead.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const leadRouter = Router();

leadRouter.use(authorizeRoles("user", "admin", "superAdmin"));
leadRouter.use(enforcePlanFeature("salesPipeline"));

const workspaceLocator = (): string => "WORKSPACE";
const idLocator = (req: Request): string => req.params.id;

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
  requirePermission("CRM.LEADS.CREATE", workspaceLocator),
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
  requirePermission("CRM.LEADS.VIEW", workspaceLocator),
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
  requirePermission("CRM.LEADS.VIEW", idLocator),
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
  requirePermission("CRM.LEADS.UPDATE", idLocator),
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
  requirePermission("CRM.LEADS.DELETE", idLocator),
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
  requirePermission("CRM.LEADS.CONVERT", idLocator),
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
  requirePermission("CRM.LEADS.ASSIGN", idLocator),
  asyncHandler(leadController.assign),
);

export default leadRouter;
