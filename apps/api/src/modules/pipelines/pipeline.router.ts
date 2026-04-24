import { Router, Request } from "express";
import { EnvFeature } from "@repo/shared";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { requirePermission } from "@/middlewares/requirePermission";
import { enforcePlanFeature } from "@/middlewares/enforcePlanLimits";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import pipelineController from "./pipeline.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const pipelineRouter = Router();

pipelineRouter.use(authorizeRoles("user", "admin", "superAdmin"));
pipelineRouter.use(enforceEnvFeature(EnvFeature.CRM_PIPELINES_TAB));
pipelineRouter.use(enforcePlanFeature("salesPipeline"));

const workspaceLocator = (): string => "WORKSPACE";
const idLocator = (req: Request): string => req.params.id;

/**
 * @swagger
 * /pipelines:
 *   post:
 *     summary: Create pipeline
 *     tags: [Pipelines]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               stages: { type: array, items: { type: object } }
 *     responses:
 *       201: { description: Pipeline created }
 */
pipelineRouter.post(
  "/",
  requirePermission("CRM.PIPELINES.CREATE", workspaceLocator),
  asyncHandler(pipelineController.create),
);

/**
 * @swagger
 * /pipelines/seed-framework:
 *   post:
 *     summary: Seed the 3 CRM framework pipelines (New Sales, Remarketing, Repurchase) with default stages, journey types, and tags
 *     tags: [Pipelines]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201: { description: Framework seeded }
 */
pipelineRouter.post(
  "/seed-framework",
  requirePermission("CRM.PIPELINES.CREATE", workspaceLocator),
  asyncHandler(pipelineController.seedFramework),
);

/**
 * @swagger
 * /pipelines:
 *   get:
 *     summary: Get all pipelines
 *     tags: [Pipelines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Pipelines list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedPipelinesResponse'
 */
pipelineRouter.get(
  "/",
  requirePermission("CRM.PIPELINES.VIEW", workspaceLocator),
  asyncHandler(pipelineController.getAll),
);

/**
 * @swagger
 * /pipelines/templates:
 *   get:
 *     summary: List CRM pipeline templates (metadata and stage definitions)
 *     description: Read-only catalog for onboarding; create pipelines via POST /pipelines with stages from a template.
 *     tags: [Pipelines]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Template list
 */
pipelineRouter.get(
  "/templates",
  requirePermission("CRM.PIPELINES.VIEW", workspaceLocator),
  asyncHandler(pipelineController.listTemplates),
);

/**
 * @swagger
 * /pipelines/{id}:
 *   get:
 *     summary: Get pipeline by ID
 *     tags: [Pipelines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Pipeline details }
 *       404: { description: Not found }
 */
pipelineRouter.get(
  "/:id",
  requirePermission("CRM.PIPELINES.VIEW", idLocator),
  asyncHandler(pipelineController.getById),
);

/**
 * @swagger
 * /pipelines/{id}:
 *   put:
 *     summary: Update pipeline
 *     tags: [Pipelines]
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
 *               stages: { type: array }
 *     responses:
 *       200: { description: Pipeline updated }
 */
pipelineRouter.put(
  "/:id",
  requirePermission("CRM.PIPELINES.UPDATE", idLocator),
  asyncHandler(pipelineController.update),
);

/**
 * @swagger
 * /pipelines/{id}:
 *   delete:
 *     summary: Delete pipeline
 *     tags: [Pipelines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Pipeline deleted }
 */
pipelineRouter.delete(
  "/:id",
  requirePermission("CRM.PIPELINES.DELETE", idLocator),
  asyncHandler(pipelineController.delete),
);

export default pipelineRouter;
