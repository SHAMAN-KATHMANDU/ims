import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { requirePermission } from "@/middlewares/requirePermission";
import {
  paramLocator,
  workspaceLocator,
} from "@/shared/permissions/resourceLocator";
import { enforcePlanFeature } from "@/middlewares/enforcePlanLimits";
import companyController from "./company.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const companyRouter = Router();

companyRouter.use(authorizeRoles("user", "admin", "superAdmin"));
companyRouter.use(enforcePlanFeature("salesPipeline"));

/**
 * @swagger
 * /companies/list:
 *   get:
 *     summary: List companies for select dropdown
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Companies list }
 */
companyRouter.get(
  "/list",
  requirePermission("CRM.COMPANIES.VIEW", workspaceLocator()),
  asyncHandler(companyController.listForSelect),
);

/**
 * @swagger
 * /companies:
 *   post:
 *     summary: Create company
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201: { description: Company created }
 */
companyRouter.post(
  "/",
  requirePermission("CRM.COMPANIES.CREATE", workspaceLocator()),
  asyncHandler(companyController.create),
);

/**
 * @swagger
 * /companies:
 *   get:
 *     summary: Get all companies
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Companies list }
 */
companyRouter.get(
  "/",
  requirePermission("CRM.COMPANIES.VIEW", workspaceLocator()),
  asyncHandler(companyController.getAll),
);

/**
 * @swagger
 * /companies/{id}:
 *   get:
 *     summary: Get company by ID
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Company details }
 */
companyRouter.get(
  "/:id",
  requirePermission("CRM.COMPANIES.VIEW", paramLocator("COMPANY")),
  asyncHandler(companyController.getById),
);

/**
 * @swagger
 * /companies/{id}:
 *   put:
 *     summary: Update company
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Company updated }
 */
companyRouter.put(
  "/:id",
  requirePermission("CRM.COMPANIES.UPDATE", paramLocator("COMPANY")),
  asyncHandler(companyController.update),
);

/**
 * @swagger
 * /companies/{id}:
 *   delete:
 *     summary: Delete company
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Company deleted }
 */
companyRouter.delete(
  "/:id",
  requirePermission("CRM.COMPANIES.DELETE", paramLocator("COMPANY")),
  asyncHandler(companyController.delete),
);

export default companyRouter;
